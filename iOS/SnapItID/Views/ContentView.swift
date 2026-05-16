import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PhotoCaptureViewModel()

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
                        Text(status)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
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
                        ComplianceResultView(result: result, onDismiss: viewModel.reset)
                    }

                    Divider().padding(.horizontal, 24).padding(.top, 8)

                    // Examples gallery
                    ExamplesView()

                    Spacer(minLength: 16)
                }
                .padding(.vertical, 12)
            }
            .navigationBarTitleDisplayMode(.inline)
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

            Button(action: viewModel.saveResultToPhotos) {
                Label("Save to Photos", systemImage: "square.and.arrow.down")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(maxWidth: .infinity).frame(height: 44)
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal, 24)
    }
}

#Preview { ContentView() }
