import SwiftUI
import PhotosUI

struct PhotoSelectionView: View {
    @ObservedObject var viewModel: PhotoCaptureViewModel
    @Binding var photoImage: UIImage?

    @State private var showCamera = false
    @State private var showPhotoPicker = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Your Photo", systemImage: "person.crop.square")
                .font(.system(size: 12, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(.white.opacity(0.5))
                .textCase(.uppercase)

            if let image = photoImage {
                VStack(spacing: 12) {
                    ZStack(alignment: .topTrailing) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: .infinity)
                            .frame(height: 280)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14)
                                .stroke(glassBorder, lineWidth: 1))

                        // Compliant badge placeholder
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(snapAccent)
                            .padding(10)
                    }

                    HStack(spacing: 10) {
                        photoActionBtn("Retake", icon: "camera.fill", gradient: false) {
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                showCamera = true
                            } else { showPhotoPicker = true }
                        }
                        photoActionBtn("Change Photo", icon: "photo", gradient: false) {
                            showPhotoPicker = true
                        }
                    }
                }
            } else {
                VStack(spacing: 20) {
                    VStack(spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(LinearGradient(colors: [snapAccent.opacity(0.2), snapAccent2.opacity(0.1)],
                                                     startPoint: .topLeading, endPoint: .bottomTrailing))
                                .frame(width: 72, height: 72)
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 32, weight: .medium))
                                .foregroundStyle(snapAccent)
                        }
                        Text("No photo selected")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Take or upload a clear front-facing photo")
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.5))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 28)
                    .glassCard(14)

                    HStack(spacing: 10) {
                        photoActionBtn("Take Photo", icon: "camera.fill", gradient: true) {
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                showCamera = true
                            } else { showPhotoPicker = true }
                        }
                        photoActionBtn("Choose", icon: "photo.on.rectangle", gradient: false) {
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
    private func photoActionBtn(_ title: String, icon: String, gradient: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.system(size: 14, weight: .bold))
                .frame(maxWidth: .infinity)
                .frame(height: 46)
                .foregroundStyle(gradient ? .black.opacity(0.85) : .white)
                .background(
                    Group {
                        if gradient {
                            AnyView(LinearGradient(colors: [snapAccent, snapAccent2],
                                                   startPoint: .leading, endPoint: .trailing))
                        } else {
                            AnyView(glassFill)
                        }
                    }
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(gradient ? Color.clear : glassBorder, lineWidth: 1)
                )
        }
    }
}


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
