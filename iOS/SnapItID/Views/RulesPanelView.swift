import SwiftUI

struct RulesPanelView: View {
    let rules: CountryRules
    let documentType: DocumentType

    private var size: PhotoSize {
        documentType == .visa ? rules.visaSize : rules.passportSize
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(rules.countryName)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text(documentType.displayName.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1)
                        .foregroundStyle(snapAccent)
                }
                Spacer()
                Text("\(size.width) × \(size.height) mm")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Capsule().fill(glassFill)
                        .overlay(Capsule().stroke(glassBorder, lineWidth: 1)))
            }
            Rectangle().fill(glassBorder).frame(height: 1)
            HStack(spacing: 8) {
                ruleChip("Background", rules.backgroundColorRequirement.displayName, icon: "photo")
                ruleChip("Smile", rules.smileAllowed ? "OK" : "No",
                         icon: rules.smileAllowed ? "face.smiling" : "xmark",
                         accent: rules.smileAllowed ? snapAccent : Color(red: 1, green: 0.45, blue: 0.45))
                ruleChip("Glasses", rules.glassesAllowed ? "OK" : "No",
                         icon: rules.glassesAllowed ? "eyeglasses" : "xmark",
                         accent: rules.glassesAllowed ? snapAccent : Color(red: 1, green: 0.45, blue: 0.45))
                ruleChip("Head cover", rules.headCoverageAllowed ? "OK" : "No",
                         icon: rules.headCoverageAllowed ? "checkmark" : "xmark",
                         accent: rules.headCoverageAllowed ? snapAccent : Color(red: 1, green: 0.45, blue: 0.45))
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(glassFill)
                .overlay(RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        LinearGradient(colors: [snapAccent.opacity(0.4), glassBorder],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        lineWidth: 1))
        )
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func ruleChip(_ key: String, _ value: String, icon: String,
                          accent: Color = Color.white.opacity(0.6)) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(accent)
            Text(value)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(accent)
            Text(key)
                .font(.system(size: 9))
                .foregroundStyle(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.white.opacity(0.05)))
    }
}
