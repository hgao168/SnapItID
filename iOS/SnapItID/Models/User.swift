import Foundation

/// User tier matching the backend worker — see backend/workers/payments/index.ts.
enum UserTier: String, Codable {
    case free     = "free"
    case pro      = "pro"        // Premium Monthly subscription
    case lifetime = "lifetime"   // One-time Lifetime purchase

    var displayName: String {
        switch self {
        case .free:     return "Free"
        case .pro:      return "Pro"
        case .lifetime: return "Lifetime"
        }
    }

    /// Premium & Lifetime users get unwatermarked AI photos + premium countries.
    var isPaid: Bool { self != .free }

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = UserTier(rawValue: raw) ?? .free
    }
}

struct AuthUser: Codable, Equatable {
    let id: String
    let email: String
    let name: String
    let tier: UserTier
}

/// Response wrapper for login/register: backend returns user fields + token.
struct AuthSession: Decodable {
    let id: String
    let email: String
    let name: String
    let tier: UserTier
    let token: String?

    var user: AuthUser { AuthUser(id: id, email: email, name: name, tier: tier) }
}
