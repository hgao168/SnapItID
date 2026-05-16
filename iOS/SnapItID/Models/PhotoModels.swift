import Foundation
import UIKit

// MARK: - Photo Model
struct PhotoSubmission: Codable, Identifiable {
    let id: String
    var imageData: Data?
    let countryCode: String
    let documentType: DocumentType
    let timestamp: Date
    var complianceResult: ComplianceResult?
    
    enum CodingKeys: String, CodingKey {
        case id, countryCode, documentType, timestamp, complianceResult
        // imageData is excluded from coding
    }
}

// MARK: - Document Type
enum DocumentType: String, Codable, CaseIterable {
    case passport = "PASSPORT"
    case visa = "VISA"
    case driverLicense = "DRIVER_LICENSE"
    case idCard = "ID_CARD"
    
    var displayName: String {
        switch self {
        case .passport: return "Passport"
        case .visa: return "Visa"
        case .driverLicense: return "Driver License"
        case .idCard: return "ID Card"
        }
    }
}

// MARK: - Compliance Result
struct ComplianceResult: Codable, Identifiable {
    let id: String
    let isCompliant: Bool
    let complianceScore: Double // 0-100
    let issues: [ComplianceIssue]
    let recommendations: [String]
    let processingTime: Double // in seconds
    let timestamp: Date
}

// MARK: - Compliance Issue
struct ComplianceIssue: Codable, Identifiable {
    let id: String
    let severity: IssueSeverity
    let category: IssueCategory
    let description: String
    let suggestion: String?
}

enum IssueSeverity: String, Codable, CaseIterable {
    case critical = "CRITICAL"
    case warning = "WARNING"
    case info = "INFO"
}

enum IssueCategory: String, Codable, CaseIterable {
    case headSize = "HEAD_SIZE"
    case eyePosition = "EYE_POSITION"
    case glassesReflection = "GLASSES_REFLECTION"
    case smileDetection = "SMILE_DETECTED"
    case shadowDetection = "SHADOW_DETECTED"
    case earVisibility = "EAR_VISIBILITY"
    case hairObstruction = "HAIR_OBSTRUCTION"
    case exposure = "EXPOSURE"
    case background = "BACKGROUND"
    case resolution = "RESOLUTION"
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
    let minResolution: Int // in megapixels
    let printFormat: String // "4x6", "3x4", etc.
    let lastUpdated: Date
}

struct PhotoSize: Codable {
    let width: Int // in mm
    let height: Int // in mm
    let headHeight: Int // head height range in pixels for given resolution
}

enum BackgroundRequirement: String, Codable {
    case white = "WHITE"
    case lightNeutral = "LIGHT_NEUTRAL"
    case lightBlue = "LIGHT_BLUE"
    case any = "ANY"
}
