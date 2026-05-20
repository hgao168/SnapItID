import SwiftUI

// MARK: - Shared design tokens (glass theme)

let snapAccent   = Color(red: 0.0,  green: 0.83, blue: 0.73)   // teal
let snapAccent2  = Color(red: 0.16, green: 0.65, blue: 1.0)    // cyan
let glassFill    = Color.white.opacity(0.08)
let glassBorder  = Color.white.opacity(0.14)
let bgTop        = Color(red: 0.05, green: 0.07, blue: 0.18)
let bgBottom     = Color(red: 0.02, green: 0.03, blue: 0.12)

struct GlassCard: ViewModifier {
    var cornerRadius: CGFloat = 16
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(glassFill)
                    .overlay(RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(glassBorder, lineWidth: 1))
            )
    }
}
extension View {
    func glassCard(_ r: CGFloat = 16) -> some View { modifier(GlassCard(cornerRadius: r)) }
}

// MARK: - ContentView

struct ContentView: View {
    @StateObject private var viewModel = PhotoCaptureViewModel()
    @StateObject private var auth = AuthService.shared
    @State private var showPrintOptions = false
    @State private var showShareSheet = false
    @State private var shareImage: UIImage? = nil
    @State private var showAuth = false

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(colors: [bgTop, bgBottom],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
                    .ignoresSafeArea()

                // Decorative glow orbs
                GeometryReader { geo in
                    Circle()
                        .fill(snapAccent.opacity(0.12))
                        .frame(width: 300, height: 300)
                        .blur(radius: 80)
                        .offset(x: geo.size.width * 0.5, y: -60)
                    Circle()
                        .fill(snapAccent2.opacity(0.08))
                        .frame(width: 250, height: 250)
                        .blur(radius: 70)
                        .offset(x: -60, y: geo.size.height * 0.55)
                }
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        heroSection
                        CountrySelectionView(selectedCountry: $viewModel.selectedCountry)
                        DocumentTypeSelectionView(selectedType: $viewModel.selectedDocumentType)
                        if let rules = viewModel.rules {
                            RulesPanelView(rules: rules, documentType: viewModel.selectedDocumentType)
                        }
                        PhotoSelectionView(viewModel: viewModel, photoImage: $viewModel.photoImage)
                        if let rules = viewModel.rules, viewModel.photoImage != nil {
                            EnhanceHintView(rules: rules, documentType: viewModel.selectedDocumentType)
                        }
                        if viewModel.photoImage != nil { actionRow }
                        if let enhanced = viewModel.enhancedImage {
                            enhancedPreview(enhanced: enhanced)
                        }
                        statusRow
                        if let result = viewModel.complianceResult {
                            ComplianceResultView(
                                result: result,
                                rules: viewModel.rules,
                                documentType: viewModel.selectedDocumentType,
                                onDismiss: viewModel.reset
                            )
                        }
                        Rectangle()
                            .fill(glassBorder)
                            .frame(height: 1)
                            .padding(.horizontal, 24)
                            .padding(.top, 8)
                        ExamplesView()
                        Spacer(minLength: 32)
                    }
                    .padding(.vertical, 12)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showPrintOptions) {
                if let img = viewModel.enhancedImage ?? viewModel.photoImage {
                    let photoSizeMm: CGSize = {
                        if let r = viewModel.rules {
                            let s = viewModel.selectedDocumentType == .visa ? r.visaSize : r.passportSize
                            return CGSize(width: s.width, height: s.height)
                        }
                        return CGSize(width: 35, height: 45)
                    }()
                    PrintOptionsView(
                        isPresented: $showPrintOptions,
                        photo: img,
                        photoSizeMm: photoSizeMm,
                        onGenerate: { sheet in
                            shareImage = sheet
                            showShareSheet = true
                        }
                    )
                }
            }
            .sheet(isPresented: $showShareSheet) {
                if let img = shareImage { ShareSheet(items: [img]) }
            }
            .sheet(isPresented: $showAuth) {
                NavigationStack { AuthView().environmentObject(auth) }
                    .preferredColorScheme(.dark)
            }
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 0) {
                    Text("SnapIt").font(.system(size: 32, weight: .heavy)).foregroundStyle(.white)
                    Text("ID").font(.system(size: 32, weight: .heavy)).foregroundStyle(snapAccent)
                }
                Text("Compliant passport & visa photos. AI-enhanced.")
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.55))
            }
            Spacer()
            // Account / tier badge — opens sign-in sheet for guests,
            // shows tier label and quick logout for authenticated users.
            accountBadge
        }
        .padding(.horizontal, 24)
        .padding(.top, 8)
    }

    // MARK: - Account badge

    @ViewBuilder
    private var accountBadge: some View {
        Menu {
            if auth.isAuthenticated, let u = auth.user {
                Section {
                    Text(u.name).font(.caption)
                    Text(u.email).font(.caption2)
                }
                Section {
                    Text("Plan: \(u.tier.displayName)")
                    if !u.tier.isPaid {
                        Link("Upgrade to Premium",
                             destination: URL(string: "https://snapitid.ai/#pricing")!)
                        Link("Get Lifetime",
                             destination: URL(string: "https://snapitid.ai/#pricing")!)
                    }
                    Button("Refresh status") { Task { await auth.refresh() } }
                }
                Button("Sign out", role: .destructive) { auth.logout() }
            } else {
                Button("Sign in / Register") { showAuth = true }
                Link("View plans",
                     destination: URL(string: "https://snapitid.ai/#pricing")!)
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: auth.isAuthenticated
                      ? (auth.isPaid ? "crown.fill" : "person.crop.circle.fill")
                      : "person.crop.circle")
                    .font(.system(size: 13, weight: .semibold))
                Text(auth.isAuthenticated ? auth.tier.displayName.uppercased() : "SIGN IN")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.8)
            }
            .foregroundStyle(auth.isPaid ? .black.opacity(0.85) : .white)
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(
                Group {
                    if auth.isPaid {
                        LinearGradient(colors: [snapAccent, snapAccent2],
                                       startPoint: .leading, endPoint: .trailing)
                    } else {
                        glassFill
                    }
                }
            )
            .clipShape(Capsule())
            .overlay(Capsule().stroke(
                auth.isPaid ? Color.clear : glassBorder, lineWidth: 1
            ))
        }
    }

    // MARK: - Action row

    @ViewBuilder
    private var actionRow: some View {
        HStack(spacing: 12) {
            Button(action: viewModel.runEnhance) {
                HStack(spacing: 8) {
                    if viewModel.isEnhancing {
                        ProgressView().tint(.black).scaleEffect(0.8)
                    } else {
                        Image(systemName: "sparkles").font(.system(size: 14, weight: .semibold))
                    }
                    Text(viewModel.isEnhancing ? "Enhancing…" : "AI Enhance")
                        .font(.system(size: 14, weight: .bold))
                }
                .frame(maxWidth: .infinity).frame(height: 50)
                .foregroundStyle(.black.opacity(0.85))
                .background(
                    LinearGradient(colors: [snapAccent, snapAccent2],
                                   startPoint: .leading, endPoint: .trailing)
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(viewModel.isEnhancing || viewModel.isCheckingCompliance)

            Button(action: viewModel.runComplianceCheck) {
                HStack(spacing: 8) {
                    if viewModel.isCheckingCompliance {
                        ProgressView().tint(snapAccent).scaleEffect(0.8)
                    } else {
                        Image(systemName: "checkmark.seal").font(.system(size: 14, weight: .semibold))
                    }
                    Text(viewModel.isCheckingCompliance ? "Checking…" : "Check")
                        .font(.system(size: 14, weight: .bold))
                }
                .frame(maxWidth: .infinity).frame(height: 50)
                .foregroundStyle(.white)
                .glassCard(14)
            }
            .disabled(viewModel.isEnhancing || viewModel.isCheckingCompliance)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Status row

    @ViewBuilder
    private var statusRow: some View {
        let isActive = viewModel.isEnhancing || viewModel.isCheckingCompliance
        if let status = viewModel.statusMessage {
            HStack(spacing: 8) {
                if isActive {
                    ProgressView().tint(snapAccent).scaleEffect(0.75)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(snapAccent)
                        .font(.system(size: 13))
                }
                Text(status)
                    .font(.system(size: 13, weight: isActive ? .semibold : .regular))
                    .foregroundStyle(isActive ? snapAccent : .white.opacity(0.75))
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(10)
            .padding(.horizontal, 24)
        }
        if let error = viewModel.errorMessage {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundStyle(Color(red: 1, green: 0.35, blue: 0.35))
                    .font(.system(size: 13))
                Text(error)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color(red: 1, green: 0.55, blue: 0.55))
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.red.opacity(0.12))
                    .overlay(RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1))
            )
            .padding(.horizontal, 24)
        }
    }

    // MARK: - Enhanced preview

    @ViewBuilder
    private func enhancedPreview(enhanced: UIImage) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(snapAccent)
                    Text("AI-Enhanced Result")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                }
                Spacer()
            }

            Image(uiImage: enhanced)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(snapAccent.opacity(0.3), lineWidth: 1.5))

            HStack(spacing: 10) {
                Button(action: viewModel.saveResultToPhotos) {
                    Label("Save", systemImage: "square.and.arrow.down")
                        .font(.system(size: 14, weight: .bold))
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .foregroundStyle(.black.opacity(0.85))
                        .background(LinearGradient(colors: [snapAccent, snapAccent2],
                                                   startPoint: .leading, endPoint: .trailing))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                Button {
                    shareImage = enhanced; showShareSheet = true
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(.system(size: 14, weight: .bold))
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .foregroundStyle(.white)
                        .glassCard(12)
                }
            }
            Button { showPrintOptions = true } label: {
                Label("Print Sheet", systemImage: "printer")
                    .font(.system(size: 14, weight: .bold))
                    .frame(maxWidth: .infinity).frame(height: 44)
                    .foregroundStyle(.white)
                    .glassCard(12)
            }
        }
        .padding(16)
        .glassCard(18)
        .padding(.horizontal, 24)
    }
}

#Preview { ContentView() }

// MARK: - Print Options Sheet

struct PrintOptionsView: View {
    @Binding var isPresented: Bool
    let photo: UIImage
    let photoSizeMm: CGSize
    let onGenerate: (UIImage) -> Void

    enum PrintPaper: CaseIterable, Identifiable {
        case a4, fourBySix
        var id: Self { self }
        var label: String {
            switch self {
            case .a4: return "A4 (210 × 297 mm)"
            case .fourBySix: return "4 × 6 Photo (102 × 152 mm)"
            }
        }
        var sizeMm: CGSize {
            switch self {
            case .a4: return CGSize(width: 210, height: 297)
            case .fourBySix: return CGSize(width: 102, height: 152)
            }
        }
        var cols: Int { self == .a4 ? 5 : 2 }
        var countOptions: [Int] { self == .a4 ? [5, 10, 15, 20] : [4, 8] }
    }

    @State private var selectedPaper: PrintPaper = .a4
    @State private var selectedCount: Int = 5

    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Paper Size")) {
                    ForEach(PrintPaper.allCases) { paper in
                        HStack {
                            Text(paper.label)
                            Spacer()
                            if selectedPaper == paper {
                                Image(systemName: "checkmark").foregroundStyle(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedPaper = paper
                            selectedCount = paper.countOptions[0]
                        }
                    }
                }
                Section(header: Text("Photos per Sheet")) {
                    ForEach(selectedPaper.countOptions, id: \.self) { n in
                        HStack {
                            Text("\(n) photos")
                            Spacer()
                            if selectedCount == n {
                                Image(systemName: "checkmark").foregroundStyle(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { selectedCount = n }
                    }
                }
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Photo size: \(Int(photoSizeMm.width)) × \(Int(photoSizeMm.height)) mm")
                            .font(.system(size: 13, weight: .medium))
                        Text("Set print scale to 100% (Actual Size) for correct dimensions.")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Print Sheet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Print") {
                        onGenerate(buildSheet())
                        isPresented = false
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func buildSheet() -> UIImage {
        let mmToPx: CGFloat = 300.0 / 25.4
        let marginPx = 8.0 * mmToPx
        let gapPx = 3.0 * mmToPx
        let cols = selectedPaper.cols
        let paperMm = selectedPaper.sizeMm
        let paperPx = CGSize(width: paperMm.width * mmToPx, height: paperMm.height * mmToPx)
        let photoPx = CGSize(width: photoSizeMm.width * mmToPx, height: photoSizeMm.height * mmToPx)

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1.0
        let renderer = UIGraphicsImageRenderer(size: paperPx, format: format)
        return renderer.image { _ in
            UIColor.white.setFill()
            UIRectFill(CGRect(origin: .zero, size: paperPx))
            for i in 0..<selectedCount {
                let col = CGFloat(i % cols)
                let row = CGFloat(i / cols)
                let x = marginPx + col * (photoPx.width + gapPx)
                let y = marginPx + row * (photoPx.height + gapPx)
                photo.draw(in: CGRect(x: x, y: y, width: photoPx.width, height: photoPx.height))
            }
        }
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

