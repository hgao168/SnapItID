import SwiftUI

/// Before/after gallery using bundled example images.
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
                    imageName: "before",
                    caption: "Selfie. Glasses on. Cluttered background.",
                    cardYOffset: 0
                )
                ExampleCard(
                    tag: "AFTER",
                    tagColor: snapAccent.opacity(0.3),
                    tagText: snapAccent,
                    imageName: "after",
                    caption: "Glasses removed, pure-white background, 35×45 mm @ 300 DPI.",
                    cardYOffset: 8
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
    let imageName: String
    let caption: String
    let cardYOffset: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topLeading) {
                Image(imageName)
                    .resizable()
                    .scaledToFill()
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.clear)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(glassBorder, lineWidth: 1)
                    )
                .frame(height: 220)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(glassFill)
                )

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
        .offset(y: cardYOffset)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview { ExamplesView() }
