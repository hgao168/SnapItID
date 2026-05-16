import Foundation
import UIKit

// MARK: - Photo Submission

struct PhotoSubmission: Codable, Identifiable {
    let id: String
    var imageData: Data?
    let countryCode: String
    let documentType: DocumentType
    let timestamp: Date
    var complianceResult: ComplianceResult?

    enum CodingKeys: String, CodingKey {
        case id, countryCode, documentType, timestamp, complianceResult
    }
}

// MARK: - Document Type

enum DocumentType: String, Codable, CaseIterable {
    case passport = "PASSPORT"
    case visa     = "VISA"

    var displayName: String {
        switch self {
        case .passport: return "Passport"
        case .visa:     return "Visa"
        }
    }
}

// MARK: - Compliance Result (mirrors worker envelope { success, result: { ... } })

struct ComplianceResult: Codable, Identifiable {
    let id: String
    let isCompliant: Bool
    let complianceScore: Double
    let issues: [ComplianceIssue]
    let recommendations: [String]
    let processingTime: Double
    let timestamp: Date

    /// Computed confidence label, matching the web UI semantics.
    var confidenceLabel: String {
        if issues.contains(where: { $0.category == .aiService }) { return "LOW" }
        if complianceScore >= 90 { return "HIGH" }
        if complianceScore >= 75 { return "MEDIUM" }
        return "LOW"
    }
}

struct ComplianceIssue: Codable, Identifiable {
    let id: String
    let severity: IssueSeverity
    let category: IssueCategory
    let description: String
    let suggestion: String?
}

enum IssueSeverity: String, Codable, CaseIterable {
    case critical = "CRITICAL"
    case warning  = "WARNING"
    case info     = "INFO"
}

enum IssueCategory: String, Codable, CaseIterable {
    case headSize           = "HEAD_SIZE"
    case eyePosition        = "EYE_POSITION"
    case glassesForbidden   = "GLASSES_FORBIDDEN"
    case glassesReflection  = "GLASSES_REFLECTION"
    case smileDetection     = "SMILE_DETECTED"
    case shadowDetection    = "SHADOW_DETECTED"
    case earVisibility      = "EAR_VISIBILITY"
    case hairObstruction    = "HAIR_OBSTRUCTION"
    case headCoverForbidden = "HEAD_COVER_FORBIDDEN"
    case exposure           = "EXPOSURE"
    case background         = "BACKGROUND"
    case resolution         = "RESOLUTION"
    case face               = "FACE"
    case aiService          = "AI_SERVICE"
    case unknown            = "UNKNOWN"

    /// Decode unknown categories as `.unknown` so an evolving worker schema
    /// doesn't crash the iOS app.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = IssueCategory(rawValue: raw) ?? .unknown
    }
}

// MARK: - Country Rules

struct CountryRules: Codable, Identifiable {
    let id: String
    let countryCode: String
    let countryName: String
    let passportSize: PhotoSize
    let visaSize: PhotoSize
    let backgroundColorRequirement: BackgroundRequirement
    let smileAllowed: Bool
    let glassesAllowed: Bool
    let headCoverageAllowed: Bool
    let minResolution: Int
    let printFormat: String
    let lastUpdated: Date
}

struct PhotoSize: Codable {
    let width: Int
    let height: Int
    let headHeight: Int
}

enum BackgroundRequirement: String, Codable {
    case white        = "WHITE"
    case lightNeutral = "LIGHT_NEUTRAL"
    case lightBlue    = "LIGHT_BLUE"
    case offWhite     = "OFF_WHITE"
    case any          = "ANY"

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = BackgroundRequirement(rawValue: raw) ?? .white
    }

    var displayName: String {
        switch self {
        case .white:        return "White"
        case .lightNeutral: return "Light neutral"
        case .lightBlue:    return "Light blue"
        case .offWhite:     return "Off-white"
        case .any:          return "Any"
        }
    }
}

// MARK: - AI Enhance Result

struct EnhanceResult: Decodable {
    /// Data URL: "data:image/png;base64,...."
    let imageBase64: String
    let model: String

    var image: UIImage? {
        let prefix = "base64,"
        guard let range = imageBase64.range(of: prefix) else {
            if let data = Data(base64Encoded: imageBase64) { return UIImage(data: data) }
            return nil
        }
        let raw = String(imageBase64[range.upperBound...])
        guard let data = Data(base64Encoded: raw) else { return nil }
        return UIImage(data: data)
    }
}
