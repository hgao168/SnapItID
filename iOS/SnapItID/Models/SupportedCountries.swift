import Foundation

/// Single source of truth for the country list shown across the app.
/// Mirrors the 20-country list used by the web client and WeChat mini-app
/// (see `web/i18n.js` and `wechat/services/ui-data.js`), so SnapItID exposes
/// the same picker everywhere.
enum SupportedCountries {
    /// `(ISO code, display name)` pairs ordered alphabetically by display
    /// name. Worker rules at `/api/rules/{code}` are keyed by the ISO code.
    static let list: [(code: String, name: String)] = [
        ("AU", "Australia"),
        ("CA", "Canada"),
        ("CN", "China"),
        ("DE", "Germany"),
        ("ES", "Spain"),
        ("FR", "France"),
        ("GB", "United Kingdom"),
        ("ID", "Indonesia"),
        ("IN", "India"),
        ("IT", "Italy"),
        ("JP", "Japan"),
        ("MY", "Malaysia"),
        ("NL", "Netherlands"),
        ("PH", "Philippines"),
        ("PL", "Poland"),
        ("SE", "Sweden"),
        ("SG", "Singapore"),
        ("TH", "Thailand"),
        ("US", "United States"),
        ("VN", "Vietnam"),
    ]

    /// Look up the display name for a given ISO code; returns the code itself
    /// when no match is found so callers always get a non-empty string.
    /// Countries available on the free tier; all others require a Premium plan.
    static let freeCountryCodes: Set<String> = ["US", "GB", "CA", "AU", "SG", "DE", "CN", "IN", "NL"]

    static func isPremium(code: String) -> Bool { !freeCountryCodes.contains(code) }

    static func name(for code: String) -> String {
        list.first { $0.code == code }?.name ?? code
    }
}
