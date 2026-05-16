import Foundation

// MARK: - Cloudflare Service Configuration
class CloudflareService {
    static let shared = CloudflareService()
    
    private let baseURL: String
    private let apiKey: String
    private let accountID: String
    private let session: URLSession
    
    init() {
        // TODO: Move these to environment variables or config file
        self.baseURL = "https://api.cloudflare.com/client/v4"
        self.apiKey = ProcessInfo.processInfo.environment["CLOUDFLARE_API_KEY"] ?? ""
        self.accountID = ProcessInfo.processInfo.environment["CLOUDFLARE_ACCOUNT_ID"] ?? ""
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Photo Upload
    func uploadPhoto(_ photoData: Data, metadata: [String: String]) async throws -> String {
        let endpoint = "\(baseURL)/accounts/\(accountID)/images/v1"
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add image data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(photoData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add metadata
        for (key, value) in metadata {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)".data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw CloudflareError.uploadFailed("Invalid response status")
        }
        
        let result = try JSONDecoder().decode(CloudflareImageResponse.self, from: data)
        return result.result.id
    }
    
    // MARK: - Run Compliance Check (Cloudflare Worker Function)
    func checkCompliance(
        photoID: String,
        countryCode: String,
        documentType: String
    ) async throws -> ComplianceResult {
        let endpoint = "https://snapitid.ai/api/compliance/check"
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = ComplianceCheckRequest(
            photoID: photoID,
            countryCode: countryCode,
            documentType: documentType
        )
        
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw CloudflareError.complianceCheckFailed("Invalid response status")
        }
        
        let result = try JSONDecoder().decode(ComplianceCheckResponse.self, from: data)
        return result.result
    }
    
    // MARK: - Fetch Country Rules
    func fetchCountryRules(countryCode: String) async throws -> CountryRules {
        let endpoint = "https://snapitid.ai/api/rules/\(countryCode)"
        
        let request = URLRequest(url: URL(string: endpoint)!)
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw CloudflareError.fetchRulesFailed("Invalid response status")
        }
        
        let result = try JSONDecoder().decode(CountryRulesResponse.self, from: data)
        return result.result
    }
}

// MARK: - Request/Response Models
struct ComplianceCheckRequest: Codable {
    let photoID: String
    let countryCode: String
    let documentType: String
}

struct ComplianceCheckResponse: Codable {
    let success: Bool
    let result: ComplianceResult
}

struct CloudflareImageResponse: Codable {
    let success: Bool
    let result: CloudflareImage
}

struct CloudflareImage: Codable {
    let id: String
    let filename: String
    let md5: String
    let uploaded: String
}

struct CountryRulesResponse: Codable {
    let success: Bool
    let result: CountryRules
}

// MARK: - Error Handling
enum CloudflareError: LocalizedError {
    case uploadFailed(String)
    case complianceCheckFailed(String)
    case fetchRulesFailed(String)
    case invalidConfiguration
    
    var errorDescription: String? {
        switch self {
        case .uploadFailed(let msg): return "Upload failed: \(msg)"
        case .complianceCheckFailed(let msg): return "Compliance check failed: \(msg)"
        case .fetchRulesFailed(let msg): return "Failed to fetch rules: \(msg)"
        case .invalidConfiguration: return "Invalid Cloudflare configuration"
        }
    }
}
