import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PhotoCaptureViewModel()
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("SnapItID")
                        .font(.system(size: 32, weight: .bold))
                        .tracking(-0.5)
                    
                    Text("Global AI Identity Photo Platform")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24)
                .background(Color(.systemBackground))
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Step 1: Select Country
                        CountrySelectionView(selectedCountry: $viewModel.selectedCountry)
                        
                        // Step 2: Select Document Type
                        DocumentTypeSelectionView(selectedType: $viewModel.selectedDocumentType)
                        
                        // Step 3: Photo Selection
                        PhotoSelectionView(
                            viewModel: viewModel,
                            photoImage: $viewModel.photoImage
                        )
                        
                        // Step 4: Submit Button
                        if viewModel.photoImage != nil {
                            Button(action: viewModel.submitPhoto) {
                                HStack {
                                    if viewModel.isProcessing {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Text("Check Compliance")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(Color.blue)
                                .foregroundStyle(.white)
                                .cornerRadius(12)
                                .disabled(viewModel.isProcessing)
                            }
                            .padding(.horizontal, 24)
                        }
                        
                        // Results View
                        if let result = viewModel.complianceResult {
                            ComplianceResultView(result: result, onDismiss: viewModel.reset)
                        }
                        
                        // Error Message
                        if let error = viewModel.errorMessage {
                            VStack(alignment: .leading, spacing: 8) {
                                Label(error, systemImage: "exclamationmark.circle.fill")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(.red)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(16)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                            .padding(.horizontal, 24)
                        }
                    }
                    .padding(.vertical, 24)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    ContentView()
}
