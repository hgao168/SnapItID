import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PhotoCaptureViewModel()
    @State private var showPrintOptions = false
    @State private var showShareSheet = false
    @State private var shareImage: UIImage? = nil

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    // Hero
                    VStack(alignment: .leading, spacing: 8) {
                        Text("SnapItID")
                            .font(.system(size: 30, weight: .bold))
                            .tracking(-0.5)
                        Text("Compliant passport & visa photos. AI-enhanced.")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.top, 8)

                    // Country + Document
                    CountrySelectionView(selectedCountry: $viewModel.selectedCountry)
                    DocumentTypeSelectionView(selectedType: $viewModel.selectedDocumentType)

                    // Country rules panel
                    if let rules = viewModel.rules {
                        RulesPanelView(rules: rules, documentType: viewModel.selectedDocumentType)
                    }

                    // Photo capture / upload
                    PhotoSelectionView(viewModel: viewModel, photoImage: $viewModel.photoImage)

                    // Country-aware hint about AI Enhance
                    if let rules = viewModel.rules, viewModel.photoImage != nil {
                        EnhanceHintView(rules: rules, documentType: viewModel.selectedDocumentType)
                    }

                    // Action buttons
                    if viewModel.photoImage != nil {
                        actionRow
                    }

                    // Enhanced image preview
                    if let enhanced = viewModel.enhancedImage {
                        enhancedPreview(enhanced: enhanced)
                    }

                    // Status / error
                    if let status = viewModel.statusMessage {
                        let isActive = viewModel.isEnhancing || viewModel.isCheckingCompliance
                        Text(status)
                            .font(.system(size: 13, weight: isActive ? .semibold : .regular))
                            .foregroundStyle(isActive ? Color.green : Color.secondary)
                            .padding(.horizontal, 24)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let error = viewModel.errorMessage {
                        Label(error, systemImage: "exclamationmark.circle.fill")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.red)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.08))
                            .cornerRadius(8)
                            .padding(.horizontal, 24)
                    }

                    // Compliance result
                    if let result = viewModel.complianceResult {
                        ComplianceResultView(result: result, rules: viewModel.rules, onDismiss: viewModel.reset)
                    }

                    Divider().padding(.horizontal, 24).padding(.top, 8)

                    // Examples gallery
                    ExamplesView()

                    Spacer(minLength: 16)
                }
                .padding(.vertical, 12)
            }
            .navigationBarTitleDisplayMode(.inline)
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
                if let img = shareImage {
                    ShareSheet(items: [img])
                }
            }
        }
    }

    // MARK: - Actions row

    @ViewBuilder
    private var actionRow: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                Button(action: viewModel.runEnhance) {
                    HStack {
                        if viewModel.isEnhancing { ProgressView().tint(.white) }
                        else { Image(systemName: "sparkles") }
                        Text(viewModel.isEnhancing ? "Enhancing…" : "AI Enhance")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity).frame(height: 48)
                    .background(Color.green)
                    .foregroundStyle(Color(red: 0.02, green: 0.13, blue: 0.10))
                    .cornerRadius(10)
                }
                .disabled(viewModel.isEnhancing || viewModel.isCheckingCompliance)

                Button(action: viewModel.runComplianceCheck) {
                    HStack {
                        if viewModel.isCheckingCompliance { ProgressView() }
                        else { Image(systemName: "checkmark.seal") }
                        Text(viewModel.isCheckingCompliance ? "Checking…" : "Check Compliance")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity).frame(height: 48)
                    .background(Color(.systemGray6))
                    .foregroundStyle(.primary)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(.systemGray4), lineWidth: 1))
                    .cornerRadius(10)
                }
                .disabled(viewModel.isEnhancing || viewModel.isCheckingCompliance)
            }
        }
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func enhancedPreview(enhanced: UIImage) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("AI-enhanced result")
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
                if let m = viewModel.enhancedModelName {
                    Text("by \(m)")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            Image(uiImage: enhanced)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .background(Color.white)
                .cornerRadius(10)

            HStack(spacing: 10) {
                Button(action: viewModel.saveResultToPhotos) {
                    Label("Save to Photos", systemImage: "square.and.arrow.down")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .cornerRadius(8)
                }
                Button {
                    shareImage = enhanced
                    showShareSheet = true
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .background(Color(.systemGray6))
                        .foregroundStyle(.primary)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.systemGray4), lineWidth: 1))
                        .cornerRadius(8)
                }
            }
            Button {
                showPrintOptions = true
            } label: {
                Label("Print Sheet", systemImage: "printer")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(maxWidth: .infinity).frame(height: 44)
                    .background(Color(.systemGray6))
                    .foregroundStyle(.primary)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.systemGray4), lineWidth: 1))
                    .cornerRadius(8)
            }
        }
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

