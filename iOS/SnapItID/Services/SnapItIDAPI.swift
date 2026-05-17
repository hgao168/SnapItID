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
        guard let jpeg = image.jpegData(compressionQuality: 0.85) else {
            throw APIError.encoding("Failed to JPEG-encode image")
        }
        let dataURL = "data:image/jpeg;base64," + jpeg.base64EncodedString()

        let payload = CompliancePayload(
            countryCode: countryCode,
            documentType: documentType.rawValue,
            imageBase64: dataURL,
            rules: rules.map(RulesPayload.init)
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
        userId: String?
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

    // MARK: - Helpers

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
