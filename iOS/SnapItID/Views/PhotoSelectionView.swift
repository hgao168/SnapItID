import SwiftUI
import PhotosUI

struct PhotoSelectionView: View {
    @ObservedObject var viewModel: PhotoCaptureViewModel
    @Binding var photoImage: UIImage?
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your Photo")
                .font(.system(size: 16, weight: .semibold))
            
            if let photoImage = photoImage {
                VStack(spacing: 12) {
                    Image(uiImage: photoImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity)
                        .frame(height: 300)
                        .cornerRadius(12)
                        .clipped()
                    
                    HStack(spacing: 12) {
                        Button(action: { showCamera = true }) {
                            Label("Retake", systemImage: "camera.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .foregroundStyle(.blue)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.blue, lineWidth: 1.5)
                                )
                        }
                        
                        Button(action: { showPhotoPicker = true }) {
                            Label("Change", systemImage: "photo")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .foregroundStyle(.blue)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.blue, lineWidth: 1.5)
                                )
                        }
                    }
                }
            } else {
                VStack(spacing: 16) {
                    VStack(spacing: 12) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 40))
                            .foregroundStyle(.blue)
                        
                        Text("No photo selected")
                            .font(.system(size: 14, weight: .semibold))
                        
                        Text("Upload a clear photo of your identity document")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(32)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    HStack(spacing: 12) {
                        Button(action: { showCamera = true }) {
                            Label("Take Photo", systemImage: "camera.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .foregroundStyle(.white)
                                .background(Color.blue)
                                .cornerRadius(8)
                        }
                        
                        Button(action: { showPhotoPicker = true }) {
                            Label("Choose", systemImage: "photo")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .foregroundStyle(.blue)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.blue, lineWidth: 1.5)
                                )
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 24)
        .photosPicker(isPresented: $showPhotoPicker, selection: $viewModel.selectedPhoto, matching: .images)
        .onChange(of: viewModel.selectedPhoto) { oldValue, newValue in
            if newValue != nil {
                viewModel.handlePhotoSelection()
            }
        }
    }
}

#Preview {
    PhotoSelectionView(viewModel: PhotoCaptureViewModel(), photoImage: .constant(nil))
}
