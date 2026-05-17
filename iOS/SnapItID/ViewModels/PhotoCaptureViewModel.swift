import Foundation
import SwiftUI
import PhotosUI

@MainActor
final class PhotoCaptureViewModel: NSObject, ObservableObject {
    // Inputs
    @Published var selectedPhoto: PhotosPickerItem?
    @Published var photoImage: UIImage?
    @Published var selectedCountry: String = "US" {
        didSet { Task { await loadRules() } }
    }
    @Published var selectedDocumentType: DocumentType = .passport

    // Loaded country rules
    @Published var rules: CountryRules?

    // Operation state
    @Published var isCheckingCompliance: Bool = false
    @Published var isEnhancing: Bool = false
    @Published var errorMessage: String?
    @Published var statusMessage: String?

    // Outputs
    @Published var complianceResult: ComplianceResult?
    @Published var enhancedImage: UIImage?
    @Published var enhancedModelName: String?

    private let api = SnapItIDAPI.shared

    override init() {
        super.init()
        Task { await loadRules() }
    }

    // MARK: - Rules

    func loadRules() async {
        do {
            let r = try await api.fetchRules(countryCode: selectedCountry)
            self.rules = r
        } catch {
            self.rules = nil
            self.errorMessage = "Could not load \(selectedCountry) rules: \(error.localizedDescription)"
        }
    }

    // MARK: - Photo picker

    func handlePhotoSelection() {
        Task {
            do {
                if let data = try await selectedPhoto?.loadTransferable(type: Data.self),
                   let img = UIImage(data: data) {
                    self.photoImage = img
                    self.enhancedImage = nil
                    self.complianceResult = nil
                    self.errorMessage = nil
                }
            } catch {
                self.errorMessage = "Failed to load photo: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Compliance

    func runComplianceCheck() {
        guard let source = enhancedImage ?? photoImage else {
            errorMessage = "Select a photo first."
            return
        }
        Task {
            isCheckingCompliance = true
            defer { isCheckingCompliance = false }
            errorMessage = nil
            statusMessage = "Running ICAO compliance check…"
            do {
                let result = try await api.checkCompliance(
                    image: source,
                    countryCode: selectedCountry,
                    documentType: selectedDocumentType,
                    rules: rules
                )
                self.complianceResult = result
                self.statusMessage = "Compliance check complete."
            } catch {
                self.errorMessage = "Compliance check failed: \(error.localizedDescription)"
                self.statusMessage = nil
            }
        }
    }

    // MARK: - AI Enhance

    func runEnhance() {
        guard let source = photoImage else {
            errorMessage = "Select a photo first."
            return
        }
        Task {
            isEnhancing = true
            defer { isEnhancing = false }
            errorMessage = nil
            statusMessage = "AI Enhance running — replacing background and removing forbidden items…"
            do {
                var userId = UserDefaults.standard.string(forKey: "snapitid_user_id")
                if userId == nil || userId?.isEmpty == true {
                    userId = await api.ensureGuestUserId(existingUserId: nil)
                    if let resolvedUserId = userId, !resolvedUserId.isEmpty {
                        UserDefaults.standard.set(resolvedUserId, forKey: "snapitid_user_id")
                    }
                }
                let result = try await api.enhance(
                    image: source,
                    countryCode: selectedCountry,
                    documentType: selectedDocumentType,
                    rules: rules,
                    userId: userId
                )
                guard let img = result.image else {
                    throw APIError.encoding("AI returned no image")
                }
                self.enhancedImage = img
                self.enhancedModelName = result.model
                self.statusMessage = "AI enhancement complete (\(result.model))."
                self.complianceResult = nil
            } catch {
                self.errorMessage = "AI Enhance failed: \(error.localizedDescription)"
                self.statusMessage = nil
            }
        }
    }

    // MARK: - Save to Photos

    func saveResultToPhotos() {
        guard let img = enhancedImage ?? photoImage else {
            errorMessage = "Nothing to save yet."
            return
        }
        Task {
            do {
                try await PhotoSaver.save(img)
                statusMessage = "Saved to Photos."
            } catch {
                errorMessage = "Save failed: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Reset

    func reset() {
        photoImage = nil
        selectedPhoto = nil
        complianceResult = nil
        enhancedImage = nil
        enhancedModelName = nil
        errorMessage = nil
        statusMessage = nil
    }
}
