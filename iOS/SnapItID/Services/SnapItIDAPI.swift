import Foundation
import UIKit

/// Client for the deployed Cloudflare workers behind api.snapitid.ai.
///
/// Endpoints:
///   - GET  https://api.snapitid.ai/api/rules/{countryCode}
///   - POST https://api.snapitid.ai/api/compliance/check
///   - POST https://api.snapitid.ai/api/compliance/enhance
final class SnapItIDAPI {
    static let shared = SnapItIDAPI()

    private let baseURL = URL(string: "https://api.snapitid.ai")!
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 45
        config.timeoutIntervalForResource = 180
        self.session = URLSession(configuration: config)
    }

    // MARK: - Rules

    func fetchRules(countryCode: String) async throws -> CountryRules {
        let url = baseURL.appendingPathComponent("/api/rules/\(countryCode)")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        let (data, response) = try await session.data(for: req)
        try Self.ensureOK(response: response, data: data)
        let envelope = try Self.decoder.decode(APIEnvelope<CountryRules>.self, from: data)
        return envelope.result
    }

    // MARK: - Compliance

    func checkCompliance(
        image: UIImage,
        countryCode: String,
        documentType: DocumentType,
        rules: CountryRules?
    ) async throws -> ComplianceResult {
        // Downscale before sending so the AI backend never receives an
        // oversized payload. 1024 px max edge is plenty for ICAO checks and
        // keeps the request well under platform limits.
        let downscaled = Self.downscale(image, maxDimension: 1024)
        guard let jpeg = downscaled.jpegData(compressionQuality: 0.8) else {
            throw APIError.encoding("Could not prepare photo for compliance check.")
        }
        let dataURL = "data:image/jpeg;base64," + jpeg.base64EncodedString()

        let payload = CompliancePayload(
            countryCode: countryCode,
            documentType: documentType.rawValue,
            imageBase64: dataURL,
            rules: rules.map(RulesPayload.init),
            userId: nil
        )

        let url = baseURL.appendingPathComponent("/api/compliance/check")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try Self.encoder.encode(payload)

        let (data, response) = try await session.data(for: req)
        try Self.ensureOK(response: response, data: data)
        let envelope = try Self.decoder.decode(APIEnvelope<ComplianceResult>.self, from: data)
        return envelope.result
    }

    // MARK: - AI Enhance (background removal + glasses removal when forbidden)

    func enhance(
        image: UIImage,
        countryCode: String,
        documentType: DocumentType,
        rules: CountryRules?,
        userId: String?,
        authToken: String? = nil
    ) async throws -> EnhanceResult {
        guard let jpeg = image.jpegData(compressionQuality: 0.9) else {
            throw APIError.encoding("Failed to JPEG-encode image")
        }
        let dataURL = "data:image/jpeg;base64," + jpeg.base64EncodedString()

        let payload = CompliancePayload(
            countryCode: countryCode,
            documentType: documentType.rawValue,
            imageBase64: dataURL,
            rules: rules.map(RulesPayload.init),
            userId: userId
        )

        let url = baseURL.appendingPathComponent("/api/compliance/enhance")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Bearer token tells the worker the user's tier so paid users
        // get an unwatermarked AI photo.
        if let token = authToken, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try Self.encoder.encode(payload)

        let (data, response) = try await session.data(for: req)
        try Self.ensureOK(response: response, data: data)
        let envelope = try Self.decoder.decode(APIEnvelope<EnhanceResult>.self, from: data)
        return envelope.result
    }

    // MARK: - User identity

    /// Ensures we have a backend user id for tier-aware features.
    /// Returns an existing/reused guest id when available, or creates a new guest user.
    func ensureGuestUserId(existingUserId: String?) async -> String? {
        let url = baseURL.appendingPathComponent("/api/payments/guest")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload = GuestUserPayload(userId: existingUserId)
        do {
            req.httpBody = try Self.encoder.encode(payload)
            let (data, response) = try await session.data(for: req)
            try Self.ensureOK(response: response, data: data)
            let envelope = try Self.decoder.decode(APIEnvelope<PaymentUserRecord>.self, from: data)
            return envelope.result.id
        } catch {
            return nil
        }
    }

    // MARK: - Auth (register / login / fetch profile)

    /// POST /api/payments/register → { id, email, name, tier, token }
    func register(email: String, password: String, name: String) async throws -> AuthSession {
        let url = baseURL.appendingPathComponent("/api/payments/register")
        let body = RegisterPayload(email: email, password: password, name: name)
        return try await authPostJSON(url: url, body: body)
    }

    /// POST /api/payments/login → { id, email, name, tier, token }
    func login(email: String, password: String) async throws -> AuthSession {
        let url = baseURL.appendingPathComponent("/api/payments/login")
        let body = LoginPayload(email: email, password: password)
        return try await authPostJSON(url: url, body: body)
    }

    /// GET /api/payments/me (Bearer token) → up-to-date user record (tier may have changed)
    func fetchMe(token: String) async throws -> AuthUser {
        let url = baseURL.appendingPathComponent("/api/payments/me")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: req)
        try Self.ensureOK(response: response, data: data)
        let envelope = try Self.decoder.decode(APIEnvelope<AuthUser>.self, from: data)
        return envelope.result
    }

    /// POST /api/payments/ios/activate (Bearer token) → refreshed auth session
    /// containing the updated tier and a new JWT.
    func activateApplePlan(
        plan: UserTier,
        transactionId: String,
        originalTransactionId: String?,
        token: String
    ) async throws -> AuthSession {
        let url = baseURL.appendingPathComponent("/api/payments/ios/activate")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try Self.encoder.encode(ApplePlanActivatePayload(
            plan: plan.rawValue,
            transactionId: transactionId,
            originalTransactionId: originalTransactionId
        ))
        let (data, response) = try await session.data(for: req)
        try Self.ensureOK(response: response, data: data)
        let envelope = try Self.decoder.decode(APIEnvelope<AuthSession>.self, from: data)
        return envelope.result
    }

    private func authPostJSON<Body: Encodable>(url: URL, body: Body) async throws -> AuthSession {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try Self.encoder.encode(body)
        let (data, response) = try await session.data(for: req)
        try Self.ensureOK(response: response, data: data)
        let envelope = try Self.decoder.decode(APIEnvelope<AuthSession>.self, from: data)
        return envelope.result
    }

    // MARK: - Helpers

    /// Resize the image so the longest edge is at most `maxDimension` pixels.
    /// Returns the original image when it is already small enough.
    private static func downscale(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > maxDimension else { return image }
        let scale = maxDimension / longest
        let newSize = CGSize(width: floor(size.width * scale),
                             height: floor(size.height * scale))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private static func ensureOK(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("No HTTP response")
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw APIError.http(http.statusCode, body)
        }
    }
}

// MARK: - Payload types

private struct CompliancePayload: Encodable {
    let countryCode: String
    let documentType: String
    let imageBase64: String
    let rules: RulesPayload?
    let userId: String?
}

private struct GuestUserPayload: Encodable {
    let userId: String?
}

private struct RegisterPayload: Encodable {
    let email: String
    let password: String
    let name: String
}

private struct LoginPayload: Encodable {
    let email: String
    let password: String
}

private struct ApplePlanActivatePayload: Encodable {
    let plan: String
    let transactionId: String
    let originalTransactionId: String?
}

private struct PaymentUserRecord: Decodable {
    let id: String
}

private struct RulesPayload: Encodable {
    let glassesAllowed: Bool
    let smileAllowed: Bool
    let headCoverageAllowed: Bool

    init(_ r: CountryRules) {
        self.glassesAllowed = r.glassesAllowed
        self.smileAllowed = r.smileAllowed
        self.headCoverageAllowed = r.headCoverageAllowed
    }
}

struct APIEnvelope<T: Decodable>: Decodable {
    let success: Bool
    let result: T
}

enum APIError: LocalizedError {
    case encoding(String)
    case network(String)
    case http(Int, String)

    var errorDescription: String? {
        switch self {
        case .encoding(let msg): return msg
        case .network(let msg): return msg
        case .http(let code, let body):
            return "HTTP \(code): \(body.prefix(200))"
        }
    }
}
