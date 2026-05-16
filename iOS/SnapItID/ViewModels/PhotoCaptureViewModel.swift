import Foundation
import SwiftUI
import PhotosUI

@MainActor
class PhotoCaptureViewModel: NSObject, ObservableObject {
    @Published var selectedPhoto: PhotosPickerItem?
    @Published var photoImage: UIImage?
    @Published var selectedCountry: String = "US"
    @Published var selectedDocumentType: DocumentType = .passport
    @Published var isProcessing: Bool = false
    @Published var errorMessage: String?
    @Published var complianceResult: ComplianceResult?
    
    private let cloudflareService = CloudflareService.shared
    
    override init() {
        super.init()
    }
    
    // MARK: - Photo Selection
    func handlePhotoSelection() {
        Task {
            do {
                if let data = try await selectedPhoto?.loadTransferable(type: Data.self) {
                    self.photoImage = UIImage(data: data)
                }
            } catch {
                self.errorMessage = "Failed to load photo: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Upload and Check Compliance
    func submitPhoto() {
        guard let photoImage = photoImage else {
            errorMessage = "No photo selected"
            return
        }
        
        guard let photoData = photoImage.jpegData(compressionQuality: 0.8) else {
            errorMessage = "Failed to compress photo"
            return
        }
        
        Task {
            isProcessing = true
            defer { isProcessing = false }
            
            do {
                // Step 1: Upload photo to Cloudflare
                let metadata = [
                    "country": selectedCountry,
                    "documentType": selectedDocumentType.rawValue,
                    "timestamp": ISO8601DateFormatter().string(from: Date())
                ]
                
                let photoID = try await cloudflareService.uploadPhoto(photoData, metadata: metadata)
                
                // Step 2: Run compliance check
                let result = try await cloudflareService.checkCompliance(
                    photoID: photoID,
                    countryCode: selectedCountry,
                    documentType: selectedDocumentType.rawValue
                )
                
                self.complianceResult = result
            } catch {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    // MARK: - Reset
    func reset() {
        photoImage = nil
        selectedPhoto = nil
        complianceResult = nil
        errorMessage = nil
    }
}
