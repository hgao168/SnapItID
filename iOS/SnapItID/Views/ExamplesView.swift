import SwiftUI

/// Before/after gallery using images served from snapitid.ai/examples/.
struct ExamplesView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Real example")
                .font(.system(size: 12, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(.secondary)

            Text("From phone selfie to compliant passport photo.")
                .font(.system(size: 18, weight: .bold))

            Text("A real AI Enhance result: glasses removed, white background, framed to ICAO proportions — face kept 100% identical.")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 12) {
                ExampleCard(
                    tag: "BEFORE",
                    tagColor: Color.black.opacity(0.7),
                    tagText: .white,
                    url: URL(string: "https://snapitid.ai/examples/beforeImage.png")!,
                    caption: "Selfie. Glasses on. Cluttered background."
                )
                ExampleCard(
                    tag: "AFTER",
                    tagColor: Color.green,
                    tagText: Color(red: 0.02, green: 0.13, blue: 0.10),
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
                        Rectangle().fill(Color(.systemGray5)).overlay(ProgressView())
                    case .success(let img):
                        img.resizable().scaledToFill()
                    case .failure:
                        Rectangle().fill(Color(.systemGray5))
                            .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                    @unknown default:
                        Rectangle().fill(Color(.systemGray5))
                    }
                }
                .frame(height: 220)
                .clipped()
                .cornerRadius(10)

                Text(tag)
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.2)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(tagColor)
                    .foregroundStyle(tagText)
                    .clipShape(Capsule())
                    .padding(8)
            }
            Text(caption)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview { ExamplesView() }
