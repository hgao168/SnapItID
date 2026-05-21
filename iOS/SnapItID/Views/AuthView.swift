import SwiftUI

/// Sign-in / register modal — matches the web flow at /login.html.
/// Free users see this so they can register and upgrade for unwatermarked photos.
struct AuthView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) private var dismiss

    enum Mode { case login, register }
    @State private var mode: Mode = .login

    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var selectedRegistrationTier: UserTier = .free
    @State private var isWorking = false
    @State private var errorText: String?
    @StateObject private var purchases = PurchaseService.shared
    @State private var billingMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 22) {
                    header

                    // Mode switcher
                    HStack(spacing: 0) {
                        modeTab(.login, "Sign In")
                        modeTab(.register, "Create Account")
                    }
                    .padding(4)
                    .background(RoundedRectangle(cornerRadius: 12).fill(glassFill))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(glassBorder, lineWidth: 1))

                    // Fields
                    VStack(spacing: 12) {
                        if mode == .register {
                            field("Name", text: $name, icon: "person.fill")
                            registrationPlanSelector
                        }
                        field("Email", text: $email, icon: "envelope.fill",
                              keyboard: .emailAddress, autocap: false)
                        secureField("Password", text: $password)

                        if let err = errorText {
                            Text(err)
                                .font(.system(size: 12))
                                .foregroundStyle(Color(red: 1.0, green: 0.45, blue: 0.5))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    Button(action: submit) {
                        HStack(spacing: 8) {
                            if isWorking { ProgressView().tint(.black) }
                            Text(mode == .login ? "Sign In" : "Create Account")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .frame(maxWidth: .infinity).frame(height: 50)
                        .foregroundStyle(.black.opacity(0.85))
                        .background(LinearGradient(colors: [snapAccent, snapAccent2],
                                                   startPoint: .leading, endPoint: .trailing))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(isWorking || !canSubmit)
                    .opacity(canSubmit ? 1 : 0.55)

                    benefits
                    billingSection
                }
                .padding(22)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .task { await purchases.loadProducts() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Close") { dismiss() }
                    .foregroundStyle(snapAccent)
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: 10) {
            HStack(spacing: 0) {
                Text("SnapIt")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(.white)
                Text("+ID")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(snapAccent)
            }
            Text(mode == .login ? "Welcome back" : "Join SnapItID")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
            Text(mode == .login
                 ? "Sign in to unlock watermark-free photos."
                 : "Choose Free, Pro monthly, or Lifetime during sign-up.")
                .font(.system(size: 13))
                .foregroundStyle(.white.opacity(0.55))
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    private var registrationPlanSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "creditcard.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(snapAccent)
                Text("Registration Plan")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.8)
                    .foregroundStyle(.white.opacity(0.75))
            }

            HStack(spacing: 8) {
                registrationTierButton(.free, subtitle: "$0")
                registrationTierButton(.pro, subtitle: "$4.99 / month")
                registrationTierButton(.lifetime, subtitle: "$24.99")
            }
        }
    }

    @ViewBuilder
    private func registrationTierButton(_ tier: UserTier, subtitle: String) -> some View {
        let selected = selectedRegistrationTier == tier
        Button {
            selectedRegistrationTier = tier
        } label: {
            VStack(spacing: 2) {
                Text(tier.displayName)
                    .font(.system(size: 12, weight: .bold))
                Text(subtitle)
                    .font(.system(size: 10, weight: .medium))
                    .opacity(0.85)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .foregroundStyle(selected ? .black.opacity(0.85) : .white.opacity(0.75))
            .background(
                Group {
                    if selected {
                        LinearGradient(colors: [snapAccent, snapAccent2],
                                       startPoint: .leading,
                                       endPoint: .trailing)
                    } else {
                        glassFill
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(selected ? Color.clear : glassBorder, lineWidth: 1)
            )
        }
    }

    @ViewBuilder
    private func modeTab(_ m: Mode, _ title: String) -> some View {
        let isActive = mode == m
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { mode = m; errorText = nil }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .frame(maxWidth: .infinity).frame(height: 40)
                .foregroundStyle(isActive ? .black.opacity(0.85) : .white.opacity(0.6))
                .background(
                    Group {
                        if isActive {
                            LinearGradient(colors: [snapAccent, snapAccent2],
                                           startPoint: .leading, endPoint: .trailing)
                        } else { Color.clear }
                    }
                )
                .clipShape(RoundedRectangle(cornerRadius: 9))
        }
    }

    @ViewBuilder
    private func field(_ label: String, text: Binding<String>, icon: String,
                       keyboard: UIKeyboardType = .default, autocap: Bool = true) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).foregroundStyle(snapAccent).frame(width: 18)
            TextField("", text: text, prompt: Text(label).foregroundStyle(.white.opacity(0.35)))
                .keyboardType(keyboard)
                .textInputAutocapitalization(autocap ? .words : .never)
                .autocorrectionDisabled(!autocap)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 14).frame(height: 48)
        .background(RoundedRectangle(cornerRadius: 12).fill(glassFill))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(glassBorder, lineWidth: 1))
    }

    @ViewBuilder
    private func secureField(_ label: String, text: Binding<String>) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "lock.fill").foregroundStyle(snapAccent).frame(width: 18)
            SecureField("", text: text, prompt: Text(label).foregroundStyle(.white.opacity(0.35)))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 14).frame(height: 48)
        .background(RoundedRectangle(cornerRadius: 12).fill(glassFill))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(glassBorder, lineWidth: 1))
    }

    private var benefits: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("PREMIUM & LIFETIME INCLUDES")
                .font(.system(size: 10, weight: .semibold)).tracking(1.4)
                .foregroundStyle(.white.opacity(0.4))
            benefitRow("No watermark on AI-generated photos")
            benefitRow("All 20 supported countries")
            benefitRow("HD downloads at 300 DPI")
            benefitRow("Print sheet for 4×6 paper")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard(14)
    }

    private var billingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("PLANS")
                    .font(.system(size: 10, weight: .semibold)).tracking(1.4)
                    .foregroundStyle(.white.opacity(0.4))
                Spacer()
                if purchases.isLoading {
                    ProgressView().scaleEffect(0.8)
                }
            }

            planRow(
                title: "Free",
                subtitle: "Basic countries, watermark on AI preview",
                price: "$0",
                isCurrent: auth.tier == .free,
                buttonTitle: "Current Plan",
                action: nil
            )

            planRow(
                title: "Pro",
                subtitle: "All countries, watermark-free output",
                price: purchases.proProduct?.displayPrice ?? "$4.99 / month",
                isCurrent: auth.tier == .pro,
                buttonTitle: auth.tier == .pro ? "Current Plan" : "Subscribe"
            ) {
                purchase(.pro)
            }

            planRow(
                title: "Lifetime",
                subtitle: "One-time unlock, never expires",
                price: purchases.lifetimeProduct?.displayPrice ?? "$24.99 one-time",
                isCurrent: auth.tier == .lifetime,
                buttonTitle: auth.tier == .lifetime ? "Current Plan" : "Buy Lifetime"
            ) {
                purchase(.lifetime)
            }

            Button("Restore Purchases") {
                Task {
                    do {
                        try await purchases.restorePurchases(auth: auth)
                        billingMessage = "Purchases restored successfully."
                    } catch {
                        billingMessage = error.localizedDescription
                    }
                }
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(snapAccent)
            .disabled(!auth.isAuthenticated)
            .opacity(auth.isAuthenticated ? 1 : 0.5)

            if !auth.isAuthenticated {
                Text("Sign in first to purchase and sync your plan.")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.55))
            }

            if let message = billingMessage {
                Text(message)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.75))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard(14)
    }

    @ViewBuilder
    private func planRow(
        title: String,
        subtitle: String,
        price: String,
        isCurrent: Bool,
        buttonTitle: String,
        action: (() -> Void)?
    ) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.55))
                Text(price)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(snapAccent)
            }
            Spacer()
            if let action {
                Button(buttonTitle) { action() }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(isCurrent ? .white.opacity(0.6) : .black.opacity(0.85))
                    .padding(.horizontal, 10)
                    .frame(height: 32)
                    .background(
                        Group {
                            if isCurrent {
                                glassFill
                            } else {
                                LinearGradient(colors: [snapAccent, snapAccent2],
                                               startPoint: .leading,
                                               endPoint: .trailing)
                            }
                        }
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                    .disabled(isCurrent || !auth.isAuthenticated)
                    .opacity((isCurrent || !auth.isAuthenticated) ? 0.7 : 1)
            } else {
                Text(buttonTitle)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white.opacity(0.6))
                    .padding(.horizontal, 10)
                    .frame(height: 32)
                    .background(glassFill)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
            }
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.04)))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(glassBorder, lineWidth: 1))
    }

    @ViewBuilder
    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(snapAccent).font(.system(size: 13))
            Text(text).font(.system(size: 13)).foregroundStyle(.white.opacity(0.8))
        }
    }

    // MARK: - Actions

    private var canSubmit: Bool {
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty,
              password.count >= 8 else { return false }
        if mode == .register, name.trimmingCharacters(in: .whitespaces).isEmpty { return false }
        return true
    }

    private func submit() {
        Task {
            isWorking = true; errorText = nil
            defer { isWorking = false }
            do {
                if mode == .login {
                    try await auth.login(email: email.trimmingCharacters(in: .whitespaces),
                                         password: password)
                } else {
                    try await auth.register(email: email.trimmingCharacters(in: .whitespaces),
                                            password: password,
                                            name: name.trimmingCharacters(in: .whitespaces))

                    if selectedRegistrationTier != .free {
                        billingMessage = "Account created. Completing \(selectedRegistrationTier.displayName) purchase…"
                        await purchases.loadProducts()
                        do {
                            try await purchases.purchase(plan: selectedRegistrationTier, auth: auth)
                            billingMessage = "You're now on the \(auth.tier.displayName) plan."
                        } catch {
                            throw APIError.encoding("Account created, but \(selectedRegistrationTier.displayName) purchase failed: \(error.localizedDescription)")
                        }
                    }
                }
                dismiss()
            } catch {
                errorText = error.localizedDescription
            }
        }
    }

    private func purchase(_ tier: UserTier) {
        Task {
            do {
                try await purchases.purchase(plan: tier, auth: auth)
                billingMessage = "You're now on the \(auth.tier.displayName) plan."
            } catch {
                billingMessage = error.localizedDescription
            }
        }
    }
}
