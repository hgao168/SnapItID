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

            if let image = photoImage {
                VStack(spacing: 12) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity)
                        .frame(height: 300)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)

                    HStack(spacing: 12) {
                        actionButton(title: "Retake", systemImage: "camera.fill", filled: false) {
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                showCamera = true
                            } else {
                                showPhotoPicker = true
                            }
                        }
                        actionButton(title: "Change", systemImage: "photo", filled: false) {
                            showPhotoPicker = true
                        }
                    }
                }
            } else {
                VStack(spacing: 16) {
                    VStack(spacing: 12) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 40))
                            .foregroundStyle(.blue)
                        Text("No photo selected").font(.system(size: 14, weight: .semibold))
                        Text("Take or upload a clear front-facing photo")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(28)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    HStack(spacing: 12) {
                        actionButton(title: "Take Photo", systemImage: "camera.fill", filled: true) {
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                showCamera = true
                            } else {
                                showPhotoPicker = true
                            }
                        }
                        actionButton(title: "Choose", systemImage: "photo", filled: false) {
                            showPhotoPicker = true
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 24)
        .photosPicker(isPresented: $showPhotoPicker, selection: $viewModel.selectedPhoto, matching: .images)
        .onChange(of: viewModel.selectedPhoto) { _, newValue in
            if newValue != nil { viewModel.handlePhotoSelection() }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker(image: Binding(
                get: { viewModel.photoImage },
                set: { newImage in
                    viewModel.photoImage = newImage
                    if newImage != nil {
                        viewModel.complianceResult = nil
                        viewModel.enhancedImage = nil
                    }
                }
            ))
            .ignoresSafeArea()
        }
    }

    @ViewBuilder
    private func actionButton(title: String, systemImage: String, filled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.system(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .foregroundStyle(filled ? Color.white : Color.blue)
                .background(filled ? Color.blue : Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.blue, lineWidth: filled ? 0 : 1.5)
                )
                .cornerRadius(8)
        }
    }
}
