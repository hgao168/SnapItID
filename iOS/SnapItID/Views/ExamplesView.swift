import SwiftUI

/// Before/after gallery using images served from snapitid.ai/examples/.
struct ExamplesView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("REAL EXAMPLE")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.8)
                .foregroundStyle(.white.opacity(0.4))

            Text("From phone selfie to compliant passport photo.")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            Text("A real AI Enhance result: glasses removed, white background, framed to ICAO proportions — face kept 100% identical.")
                .font(.system(size: 13))
                .foregroundStyle(.white.opacity(0.55))
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 12) {
                ExampleCard(
                    tag: "BEFORE",
                    tagColor: Color.white.opacity(0.15),
                    tagText: .white,
                    url: URL(string: "https://snapitid.ai/examples/beforeImage.png")!,
                    caption: "Selfie. Glasses on. Cluttered background."
                )
                ExampleCard(
                    tag: "AFTER",
                    tagColor: snapAccent.opacity(0.3),
                    tagText: snapAccent,
                    url: URL(string: "https://snapitid.ai/examples/SnapItID.png")!,
                    caption: "Glasses removed, pure-white background, 35×45 mm @ 300 DPI."
                )
            }
        }
        .padding(.horizontal, 24)
    }
}

private struct ExampleCard: View {
    let tag: String
    let tagColor: Color
    let tagText: Color
    let url: URL
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topLeading) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        RoundedRectangle(cornerRadius: 10)
                            .fill(glassFill)
                            .overlay(ProgressView().tint(snapAccent))
                    case .success(let img):
                        img.resizable().scaledToFill()
                    case .failure:
                        RoundedRectangle(cornerRadius: 10)
                            .fill(glassFill)
                            .overlay(Image(systemName: "photo")
                                .foregroundStyle(.white.opacity(0.3)))
                    @unknown default:
                        RoundedRectangle(cornerRadius: 10).fill(glassFill)
                    }
                }
                .frame(height: 220)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(glassBorder, lineWidth: 1))

                Text(tag)
                    .font(.system(size: 9, weight: .bold))
                    .tracking(1.2)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Capsule().fill(tagColor)
                        .overlay(Capsule().stroke(tagText.opacity(0.4), lineWidth: 1)))
                    .foregroundStyle(tagText)
                    .padding(8)
            }
            Text(caption)
                .font(.system(size: 11))
                .foregroundStyle(.white.opacity(0.5))
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview { ExamplesView() }
