/// PhotoFramingService
/// Ports the website's framing.js compliance transform to Swift/iOS.
/// Uses Vision face detection to locate the head in an AI-enhanced image,
/// then renders the image at the correct passport/visa pixel dimensions
/// with the head scaled to the country's compliance ratio.

import Vision
import UIKit
import CoreGraphics

// MARK: - Framing Profile

private let DPI: CGFloat = 300
private let MM_PER_INCH: CGFloat = 25.4

private func mmToPx(_ mm: CGFloat) -> CGFloat {
    (mm / MM_PER_INCH) * DPI
}

struct FramingProfile {
    var targetHeadRatio: CGFloat = 0.56
    var minHeadRatio: CGFloat    = 0.52
    var maxHeadRatio: CGFloat    = 0.64
    var topSpaceRatio: CGFloat   = 0.10
    var minTopSpaceRatio: CGFloat = 0.07
    var maxTopSpaceRatio: CGFloat = 0.14
    var sideSpaceRatio: CGFloat  = 0.07
    var bottomSpaceRatio: CGFloat = 0.10
    var maxCenterOffsetRatio: CGFloat = 0.035
}

// Per-country overrides — mirrors COUNTRY_FRAMING_PROFILES in framing.js
private let countryFramingProfiles: [String: (passport: FramingProfile, visa: FramingProfile)] = {
    func p(_ head: CGFloat, _ top: CGFloat, _ side: CGFloat,
           _ minH: CGFloat? = nil, _ maxH: CGFloat? = nil) -> FramingProfile {
        var f = FramingProfile()
        f.targetHeadRatio = head
        f.topSpaceRatio   = top
        f.sideSpaceRatio  = side
        if let v = minH { f.minHeadRatio = v }
        if let v = maxH { f.maxHeadRatio = v }
        return f
    }
    let standard = (
        passport: p(0.56, 0.10, 0.07),
        visa:     p(0.54, 0.10, 0.07)
    )
    let asia = (
        passport: p(0.58, 0.10, 0.08, 0.54, 0.64),
        visa:     p(0.56, 0.10, 0.08, 0.52, 0.62)
    )
    return [
        "AU": standard,
        "CA": standard,
        "CN": (passport: p(0.60, 0.09, 0.08, 0.56, 0.66),
               visa:     p(0.58, 0.10, 0.08, 0.54, 0.64)),
        "DE": standard,
        "ES": standard,
        "FR": (passport: p(0.55, 0.11, 0.07), visa: p(0.54, 0.11, 0.07)),
        "GB": (passport: p(0.55, 0.11, 0.07), visa: p(0.54, 0.11, 0.07)),
        "ID": asia,
        "IN": asia,
        "IT": standard,
        "JP": (passport: p(0.57, 0.09, 0.08), visa: p(0.55, 0.10, 0.08)),
        "MY": asia,
        "NL": standard,
        "PH": asia,
        "PL": standard,
        "SE": standard,
        "SG": asia,
        "TH": asia,
        "US": standard,
        "VN": asia,
    ]
}()

/// Returns the framing profile for the given country, document type and photo size,
/// mirroring getFramingProfile() in framing.js.
func getFramingProfile(countryCode: String, documentType: DocumentType, photoSize: PhotoSize) -> FramingProfile {
    let isVisa = documentType == .visa
    var profile: FramingProfile
    if let pair = countryFramingProfiles[countryCode.uppercased()] {
        profile = isVisa ? pair.visa : pair.passport
    } else {
        profile = FramingProfile()
    }

    // Override for standard 35×45 mm — strict ICAO envelope
    let w = CGFloat(photoSize.width)
    let h = CGFloat(photoSize.height)
    let is35x45 = abs(w - 35) <= 0.6 && abs(h - 45) <= 0.6
    if is35x45 {
        profile.targetHeadRatio  = 34.0 / 45.0
        profile.minHeadRatio     = 32.0 / 45.0
        profile.maxHeadRatio     = 36.0 / 45.0
        profile.topSpaceRatio    =  4.0 / 45.0
        profile.minTopSpaceRatio =  3.0 / 45.0
        profile.maxTopSpaceRatio =  5.0 / 45.0
        return profile
    }

    // Rule-derived head ratio from headHeight (px at 300 DPI)
    let outHeightPx = mmToPx(h)
    if photoSize.headHeight > 0 && outHeightPx > 0 {
        let ruleRatio = max(0.5, min(0.72, CGFloat(photoSize.headHeight) / outHeightPx))
        profile.targetHeadRatio = ruleRatio
        profile.minHeadRatio    = max(0.50, ruleRatio - 0.04)
        profile.maxHeadRatio    = min(0.72, ruleRatio + 0.06)
    }
    return profile
}

// MARK: - Transform

struct FramingTransform {
    let dx: CGFloat
    let dy: CGFloat
    let drawW: CGFloat
    let drawH: CGFloat
}

/// Mirrors computeComplianceTransform() in framing.js exactly.
/// `fillOutput` = true for AI-enhanced images that already have a clean background.
func computeComplianceTransform(
    imageWidth: CGFloat, imageHeight: CGFloat,
    outW: CGFloat, outH: CGFloat,
    headTop: CGFloat, headBottom: CGFloat,
    headLeft: CGFloat, headRight: CGFloat,
    profile: FramingProfile,
    fillOutput: Bool = true
) -> FramingTransform {
    let headHeight = max(1, headBottom - headTop)
    let headWidth  = max(1, headRight - headLeft)
    let centerX    = (headLeft + headRight) / 2.0
    let crownY     = headTop

    let sidePaddingPx     = outW * profile.sideSpaceRatio
    let minBottomPaddingPx = outH * profile.bottomSpaceRatio
    let minTopPx          = outH * profile.minTopSpaceRatio
    let maxTopPx          = outH * profile.maxTopSpaceRatio
    let targetTopPx       = outH * profile.topSpaceRatio

    let targetHeadPx      = outH * profile.targetHeadRatio
    let minHeadPx         = outH * profile.minHeadRatio
    let maxHeadPx         = outH * profile.maxHeadRatio

    let baseScale            = targetHeadPx / headHeight
    let maxScaleByHeadRatio  = maxHeadPx    / headHeight
    let minScaleByHeadRatio  = minHeadPx    / headHeight
    let maxScaleByHeadWidth  = (outW - sidePaddingPx * 2) / headWidth
    let cappedScale = min(baseScale, maxScaleByHeadRatio, maxScaleByHeadWidth)
    var scale = max(0.08, max(minScaleByHeadRatio, cappedScale))

    if fillOutput {
        let coverScale = max(outW / imageWidth, outH / imageHeight)
        scale = min(maxScaleByHeadRatio, max(scale, coverScale))
    }

    let drawW = imageWidth  * scale
    let drawH = imageHeight * scale
    var dx = outW / 2.0 - centerX * scale
    var dy = targetTopPx   - crownY   * scale

    // Keep head within side margins
    let headLeftOut  = headLeft  * scale + dx
    if headLeftOut < sidePaddingPx { dx += sidePaddingPx - headLeftOut }
    let headRightOut = headRight * scale + dx
    if headRightOut > outW - sidePaddingPx { dx -= headRightOut - (outW - sidePaddingPx) }

    // Keep face center close to horizontal centerline
    let maxCenterOffsetPx = outW * profile.maxCenterOffsetRatio
    let headCenterOut     = ((headLeft + headRight) * 0.5) * scale + dx
    let centerDiff        = headCenterOut - outW / 2.0
    if centerDiff >  maxCenterOffsetPx { dx -= centerDiff - maxCenterOffsetPx }
    else if centerDiff < -maxCenterOffsetPx { dx += -maxCenterOffsetPx - centerDiff }

    // Keep crown within top-spacing band
    let headTopOut = headTop * scale + dy
    if headTopOut < minTopPx        { dy += minTopPx - headTopOut }
    else if headTopOut > maxTopPx   { dy -= headTopOut - maxTopPx }

    // Keep head bottom above bottom safe margin
    let headBottomOut = headBottom * scale + dy
    let maxHeadBottom = outH - minBottomPaddingPx
    if headBottomOut > maxHeadBottom { dy -= headBottomOut - maxHeadBottom }

    // Final edge clamp (only when source is larger than output)
    var finalDx = dx, finalDy = dy
    if drawW >= outW {
        if finalDx > 0 { finalDx = 0 }
        if finalDx + drawW < outW { finalDx = outW - drawW }
    }
    if drawH >= outH {
        if finalDy > 0 { finalDy = 0 }
        if finalDy + drawH < outH { finalDy = outH - drawH }
    }

    return FramingTransform(dx: finalDx, dy: finalDy, drawW: drawW, drawH: drawH)
}

// MARK: - PhotoFramingService

enum PhotoFramingService {

    /// Applies ICAO compliance framing to `image` and returns a new UIImage
    /// at the correct passport/visa pixel dimensions (300 DPI).
    ///
    /// - Uses Vision face detection to locate the head.
    /// - Falls back to center-contain fit if no face is found.
    static func applyFraming(
        image: UIImage,
        rules: CountryRules,
        documentType: DocumentType
    ) async -> UIImage {
        let photoSize = documentType == .visa ? rules.visaSize : rules.passportSize
        let outW = mmToPx(CGFloat(photoSize.width))
        let outH = mmToPx(CGFloat(photoSize.height))
        let profile = getFramingProfile(countryCode: rules.countryCode,
                                        documentType: documentType,
                                        photoSize: photoSize)

        // Detect face
        let faceRect = await detectFace(in: image)

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1          // 1pt = 1px so we get exact DPI pixel dimensions
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: outW, height: outH), format: format)

        return renderer.image { ctx in
            // White background
            UIColor.white.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: outW, height: outH))

            let imgW = image.size.width
            let imgH = image.size.height

            if let face = faceRect {
                // Vision uses normalized coordinates with origin bottom-left — flip Y
                // and convert to pixel coords in the source image.
                let pixelFaceLeft   = face.minX * imgW
                let pixelFaceBottom = (1 - face.minY) * imgH   // Vision Y is inverted
                let pixelFaceTop    = (1 - face.maxY) * imgH
                let pixelFaceRight  = face.maxX * imgW

                // Expand the crown: Vision's face rectangle usually starts near the
                // forehead/hairline, not the true crown. Use a larger uplift so
                // top spacing aligns better with country compliance requirements.
                let faceH       = pixelFaceBottom - pixelFaceTop
                let headTop     = max(0, pixelFaceTop - faceH * 0.18)
                let headBottom  = pixelFaceBottom
                let headLeft    = pixelFaceLeft
                let headRight   = pixelFaceRight

                let t = computeComplianceTransform(
                    imageWidth: imgW, imageHeight: imgH,
                    outW: outW, outH: outH,
                    headTop: headTop, headBottom: headBottom,
                    headLeft: headLeft, headRight: headRight,
                    profile: profile,
                    fillOutput: true
                )

                // Draw with pure compliance transform (no model-specific bias).
                image.draw(in: CGRect(x: t.dx, y: t.dy,
                                      width: t.drawW, height: t.drawH))
            } else {
                // No face detected: contain-fit centered (same website fallback)
                let containScale = min(outW / imgW, outH / imgH)
                let dw = imgW * containScale
                let dh = imgH * containScale
                let dx = (outW - dw) / 2
                let dy = (outH - dh) / 2
                image.draw(in: CGRect(x: dx, y: dy, width: dw, height: dh))
            }
        }
    }

    // MARK: - Face Detection

    private static func detectFace(in image: UIImage) async -> CGRect? {
        guard let cgImage = image.cgImage else { return nil }
        return await withCheckedContinuation { continuation in
            let request = VNDetectFaceRectanglesRequest { req, _ in
                let result = (req.results as? [VNFaceObservation])?.first?.boundingBox
                continuation.resume(returning: result)
            }
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(returning: nil)
            }
        }
    }
}
