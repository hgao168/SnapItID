import Foundation
import StoreKit

@MainActor
final class PurchaseService: ObservableObject {
    static let shared = PurchaseService()

    enum PurchaseError: LocalizedError {
        case notSignedIn
        case productsUnavailable
        case verificationFailed
        case pending
        case cancelled
        case unsupportedPlan

        var errorDescription: String? {
            switch self {
            case .notSignedIn:
                return "Please sign in before purchasing a plan."
            case .productsUnavailable:
                return "Purchase products are not available right now."
            case .verificationFailed:
                return "Purchase verification failed."
            case .pending:
                return "Purchase is pending approval."
            case .cancelled:
                return "Purchase was cancelled."
            case .unsupportedPlan:
                return "Unsupported plan selection."
            }
        }
    }

    // Configure these product identifiers in App Store Connect.
    let proProductId = "ai.snapitid.pro.monthly"
    let lifetimeProductId = "ai.snapitid.lifetime"

    @Published private(set) var products: [Product] = []
    @Published private(set) var isLoading = false

    var proProduct: Product? { products.first(where: { $0.id == proProductId }) }
    var lifetimeProduct: Product? { products.first(where: { $0.id == lifetimeProductId }) }

    private init() {}

    func loadProducts() async {
        isLoading = true
        defer { isLoading = false }
        do {
            products = try await Product.products(for: [proProductId, lifetimeProductId])
                .sorted { $0.displayName < $1.displayName }
        } catch {
            products = []
        }
    }

    func purchase(plan: UserTier, auth: AuthService) async throws {
        guard auth.isAuthenticated else { throw PurchaseError.notSignedIn }
        guard let token = auth.token, !token.isEmpty else { throw PurchaseError.notSignedIn }

        let product: Product
        switch plan {
        case .pro:
            guard let p = proProduct else { throw PurchaseError.productsUnavailable }
            product = p
        case .lifetime:
            guard let p = lifetimeProduct else { throw PurchaseError.productsUnavailable }
            product = p
        default:
            throw PurchaseError.unsupportedPlan
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verificationResult):
            let transaction = try checkVerified(verificationResult)
            let transactionId = String(transaction.id)
            let originalTransactionId = String(transaction.originalID)
            let session = try await SnapItIDAPI.shared.activateApplePlan(
                plan: plan,
                transactionId: transactionId,
                originalTransactionId: originalTransactionId,
                token: token
            )
            try auth.applyPurchasedSession(session)
            await transaction.finish()

        case .pending:
            throw PurchaseError.pending
        case .userCancelled:
            throw PurchaseError.cancelled
        @unknown default:
            throw PurchaseError.verificationFailed
        }
    }

    func restorePurchases(auth: AuthService) async throws {
        guard auth.isAuthenticated else { throw PurchaseError.notSignedIn }
        guard let token = auth.token, !token.isEmpty else { throw PurchaseError.notSignedIn }

        var highestTier: UserTier = .free
        var winningTransactionId: String?
        var winningOriginalId: String?

        for await result in Transaction.currentEntitlements {
            let transaction = try checkVerified(result)
            if transaction.productID == lifetimeProductId {
                highestTier = .lifetime
                winningTransactionId = String(transaction.id)
                winningOriginalId = String(transaction.originalID)
                break
            }
            if transaction.productID == proProductId {
                highestTier = .pro
                winningTransactionId = String(transaction.id)
                winningOriginalId = String(transaction.originalID)
            }
        }

        guard highestTier != .free,
              let tx = winningTransactionId else {
            throw PurchaseError.productsUnavailable
        }

        let session = try await SnapItIDAPI.shared.activateApplePlan(
            plan: highestTier,
            transactionId: tx,
            originalTransactionId: winningOriginalId,
            token: token
        )
        try auth.applyPurchasedSession(session)
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe):
            return safe
        case .unverified:
            throw PurchaseError.verificationFailed
        }
    }
}
