import SwiftUI

/// Country-aware hint, mirroring the green banner on the web app that tells
/// the user what AI Enhance will do for them in their selected country.
struct EnhanceHintView: View {
    let rules: CountryRules
    let documentType: DocumentType

    var body: some View {
        if let text = hintText {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "wand.and.sparkles")
                    .foregroundStyle(snapAccent)
                    .font(.system(size: 15, weight: .semibold))
                    .padding(.top, 1)
                Text(text)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.85))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(snapAccent.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                LinearGradient(colors: [snapAccent.opacity(0.6), snapAccent2.opacity(0.3)],
                                               startPoint: .leading, endPoint: .trailing),
                                lineWidth: 1))
            )
            .padding(.horizontal, 24)
        }
    }

    private var hintText: String? {
        var actions: [String] = []
        if rules.glassesAllowed == false { actions.append("remove your glasses") }
        if rules.headCoverageAllowed == false { actions.append("remove any head covering") }
        actions.append("replace the background with pure white")

        let forbidden: String?
        switch (rules.glassesAllowed, rules.headCoverageAllowed) {
        case (false, false): forbidden = "glasses and head coverings"
        case (false, true):  forbidden = "glasses"
        case (true,  false): forbidden = "head coverings"
        default:             forbidden = nil
        }

        guard let f = forbidden else { return nil }
        let docName = documentType == .visa ? "visa" : "passport"
        return "\(rules.countryName) forbids \(f) in \(docName) photos. " +
               "Tap “AI Enhance” to automatically \(actions.joined(separator: ", ")) while keeping your face identical."
    }
}
