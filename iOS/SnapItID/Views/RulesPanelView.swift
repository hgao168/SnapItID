import SwiftUI

struct RulesPanelView: View {
    let rules: CountryRules
    let documentType: DocumentType

    private var size: PhotoSize {
        documentType == .visa ? rules.visaSize : rules.passportSize
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(rules.countryName).font(.system(size: 15, weight: .semibold))
                Text("·").foregroundStyle(.secondary)
                Text(documentType.displayName).font(.system(size: 15, weight: .semibold))
                Spacer()
            }
            rule("Size", "\(size.width) × \(size.height) mm")
            rule("Background", rules.backgroundColorRequirement.displayName)
            rule("Smile", rules.smileAllowed ? "allowed" : "not allowed")
            rule("Glasses", rules.glassesAllowed ? "allowed" : "not allowed")
            rule("Head covering", rules.headCoverageAllowed ? "allowed" : "not allowed")
        }
        .padding(14)
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func rule(_ key: String, _ value: String) -> some View {
        HStack {
            Text(key).foregroundStyle(.secondary).font(.system(size: 13))
            Spacer()
            Text(value).font(.system(size: 13, weight: .medium))
        }
    }
}
