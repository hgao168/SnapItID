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
    @State private var isWorking = false
    @State private var errorText: String?

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
                }
                .padding(22)
            }
            .scrollDismissesKeyboard(.interactively)
        }
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
                 : "Free account · Upgrade for unwatermarked AI photos.")
                .font(.system(size: 13))
                .foregroundStyle(.white.opacity(0.55))
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
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
                }
                dismiss()
            } catch {
                errorText = error.localizedDescription
            }
        }
    }
}
