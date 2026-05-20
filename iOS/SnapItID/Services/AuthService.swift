import Foundation
import SwiftUI

/// Global auth state — owns the JWT token and the cached `AuthUser`.
/// Token is stored in UserDefaults under `snapitid_token` and the user under
/// `snapitid_user`. This mirrors the web client's localStorage keys so a
/// future shared backend behaves identically.
@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published private(set) var user: AuthUser?
    @Published private(set) var token: String?

    private let api = SnapItIDAPI.shared
    private let tokenKey = "snapitid_token"
    private let userKey  = "snapitid_user"

    private init() {
        self.token = UserDefaults.standard.string(forKey: tokenKey)
        if let data = UserDefaults.standard.data(forKey: userKey),
           let cached = try? JSONDecoder().decode(AuthUser.self, from: data) {
            self.user = cached
        }
        // Refresh tier in the background so a server-side upgrade is reflected.
        if let t = token, !t.isEmpty { Task { await self.refresh() } }
    }

    var tier: UserTier { user?.tier ?? .free }
    var isAuthenticated: Bool { token?.isEmpty == false && user != nil }
    var isPaid: Bool { tier.isPaid }

    // MARK: - Public API

    func register(email: String, password: String, name: String) async throws {
        let session = try await api.register(email: email, password: password, name: name)
        try persist(session: session)
    }

    func login(email: String, password: String) async throws {
        let session = try await api.login(email: email, password: password)
        try persist(session: session)
    }

    /// Pulls the latest user record from /api/payments/me — picks up tier upgrades
    /// performed via the web checkout while the user has been logged in on iOS.
    func refresh() async {
        guard let token = token, !token.isEmpty else { return }
        do {
            let me = try await api.fetchMe(token: token)
            self.user = me
            saveUser(me)
        } catch {
            // 401/403 → token invalid; clear it so the UI returns to signed-out
            if case let APIError.http(code, _) = error, code == 401 || code == 403 {
                logout()
            }
        }
    }

    func logout() {
        self.user = nil
        self.token = nil
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
    }

    // MARK: - Persistence

    private func persist(session: AuthSession) throws {
        guard let token = session.token, !token.isEmpty else {
            throw APIError.encoding("Server did not return an auth token")
        }
        self.token = token
        self.user  = session.user
        UserDefaults.standard.set(token, forKey: tokenKey)
        saveUser(session.user)
    }

    private func saveUser(_ user: AuthUser) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: userKey)
        }
    }
}
