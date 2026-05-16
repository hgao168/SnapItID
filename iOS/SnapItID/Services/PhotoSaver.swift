import Foundation
import UIKit
import Photos

enum PhotoSaver {
    /// Saves a UIImage to the user's Photo Library. Requires
    /// `NSPhotoLibraryAddUsageDescription` in Info.plist.
    static func save(_ image: UIImage) async throws {
        try await requestAddOnlyPermission()
        try await PHPhotoLibrary.shared().performChanges {
            PHAssetChangeRequest.creationRequestForAsset(from: image)
        }
    }

    private static func requestAddOnlyPermission() async throws {
        let status: PHAuthorizationStatus
        if #available(iOS 14, *) {
            status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        } else {
            status = PHPhotoLibrary.authorizationStatus()
        }
        switch status {
        case .authorized, .limited:
            return
        case .notDetermined:
            let granted: PHAuthorizationStatus
            if #available(iOS 14, *) {
                granted = await withCheckedContinuation { cont in
                    PHPhotoLibrary.requestAuthorization(for: .addOnly) { cont.resume(returning: $0) }
                }
            } else {
                granted = await withCheckedContinuation { cont in
                    PHPhotoLibrary.requestAuthorization { cont.resume(returning: $0) }
                }
            }
            guard granted == .authorized || granted == .limited else {
                throw NSError(domain: "PhotoSaver", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Photo library access denied"])
            }
        default:
            throw NSError(domain: "PhotoSaver", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "Photo library access denied. Enable it in Settings."])
        }
    }
}
