import SwiftUI

/// Country-aware hint, mirroring the green banner on the web app that tells
/// the user what AI Enhance will do for them in their selected country.
struct EnhanceHintView: View {
    let rules: CountryRules
    let documentType: DocumentType

    var body: some View {
        if let text = hintText {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "lightbulb.fill")
                    .foregroundStyle(Color.green)
                    .font(.system(size: 14))
                    .padding(.top, 1)
                Text(text)
                    .font(.system(size: 13))
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.green.opacity(0.10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.green.opacity(0.35), lineWidth: 1)
            )
            .cornerRadius(10)
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
