import SwiftUI

struct ComplianceResultView: View {
    let result: ComplianceResult
    let rules: CountryRules?
    let documentType: DocumentType
    let onDismiss: () -> Void

    init(result: ComplianceResult, rules: CountryRules? = nil, documentType: DocumentType = .passport, onDismiss: @escaping () -> Void) {
        self.result = result
        self.rules = rules
        self.documentType = documentType
        self.onDismiss = onDismiss
    }

    private struct RuleCheck { let label: String; let passes: Bool }
    private var selectedSize: PhotoSize? {
        guard let rules else { return nil }
        return documentType == .visa ? rules.visaSize : rules.passportSize
    }

    private func hasIssue(_ categories: Set<IssueCategory>, matching keywords: [String] = []) -> Bool {
        result.issues.contains { issue in
            guard issue.severity != .info else { return false }
            if categories.contains(issue.category) { return true }
            let text = (issue.description + " " + (issue.suggestion ?? "")).lowercased()
            return keywords.contains { text.contains($0.lowercased()) }
        }
    }

    private var analysisNote: ComplianceIssue? {
        result.issues.first(where: { $0.category == .aiService })
    }

    private var displayIssues: [ComplianceIssue] {
        result.issues.filter { $0.category != .aiService }
    }

    private var ruleChecks: [RuleCheck] {
        var checks: [RuleCheck] = []
        guard let rules else { return checks }

        if let size = selectedSize {
            checks.append(RuleCheck(label: "Photo size: \(size.width)×\(size.height) mm", passes: true))
            checks.append(RuleCheck(label: "Head height target: \(size.headHeight) px", passes: !hasIssue([.headSize, .eyePosition], matching: ["head size", "eye", "face too small", "face too large"])))
        }

        checks.append(RuleCheck(label: "Background: \(rules.backgroundColorRequirement.displayName)", passes: !hasIssue([.background], matching: ["background", "plain", "uniform"])))
        checks.append(RuleCheck(label: "Minimum resolution: \(rules.minResolution) MP", passes: !hasIssue([.resolution], matching: ["resolution", "small", "low resolution"])))
        checks.append(RuleCheck(label: rules.smileAllowed ? "Smile allowed" : "Neutral expression required", passes: rules.smileAllowed || !hasIssue([.smileDetection], matching: ["neutral", "smile", "mouth closed", "teeth"])))
        checks.append(RuleCheck(label: rules.glassesAllowed ? "Glasses allowed" : "No glasses", passes: rules.glassesAllowed || !hasIssue([.glassesForbidden, .glassesReflection], matching: ["glasses", "spectacles", "eyeglasses", "remove glasses", "glare"])))
        checks.append(RuleCheck(label: rules.headCoverageAllowed ? "Head covering allowed" : "No head covering", passes: rules.headCoverageAllowed || !hasIssue([.headCoverForbidden], matching: ["head covering", "covering"])))

        return checks
    }

    private var passColor:  Color { Color(red: 0.2, green: 0.9, blue: 0.6) }
    private var failColor:  Color { Color(red: 1.0, green: 0.35, blue: 0.45) }
    private var warnColor:  Color { Color(red: 1.0, green: 0.7,  blue: 0.2) }
    private var statusColor: Color { result.isCompliant ? passColor : failColor }
    private var statusText:  String { result.isCompliant ? "PASS" : "NEEDS ATTENTION" }
    private var scoreColor: Color {
        if result.complianceScore >= 90 { return passColor }
        if result.complianceScore >= 75 { return warnColor }
        return failColor
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {

            // ── Header ───────────────────────────────────────────────────────
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Compliance Report")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Processed in \(String(format: "%.2f", result.processingTime))s")
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.4))
                }
                Spacer()
                // Score ring
                ZStack {
                    Circle()
                        .stroke(scoreColor.opacity(0.2), lineWidth: 5)
                        .frame(width: 56, height: 56)
                    Circle()
                        .trim(from: 0, to: result.complianceScore / 100)
                        .stroke(scoreColor, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .frame(width: 56, height: 56)
                        .rotationEffect(.degrees(-90))
                    Text("\(Int(result.complianceScore))")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(scoreColor)
                }
            }

            // ── Status badge ─────────────────────────────────────────────────
            HStack(spacing: 8) {
                Image(systemName: result.isCompliant ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                    .font(.system(size: 14))
                Text(statusText)
                    .font(.system(size: 13, weight: .bold))
                    .tracking(0.5)
                Spacer()
                HStack(spacing: 10) {
                    statPill("Confidence", result.confidenceLabel)
                    statPill("Issues", "\(displayIssues.count)")
                }
            }
            .foregroundStyle(statusColor)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(statusColor.opacity(0.1))
                    .overlay(RoundedRectangle(cornerRadius: 10)
                        .stroke(statusColor.opacity(0.3), lineWidth: 1))
            )

            // ── Rule checks ──────────────────────────────────────────────────
            if !ruleChecks.isEmpty {
                VStack(spacing: 6) {
                    ForEach(ruleChecks, id: \.label) { check in
                        HStack(spacing: 10) {
                            Image(systemName: check.passes ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(check.passes ? passColor : failColor)
                                .font(.system(size: 14))
                            Text(check.label)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.white)
                            Spacer()
                            Text(check.passes ? "PASS" : "FAIL")
                                .font(.system(size: 10, weight: .bold))
                                .tracking(0.8)
                                .foregroundStyle(check.passes ? passColor : failColor)
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Capsule()
                                    .fill((check.passes ? passColor : failColor).opacity(0.15))
                                    .overlay(Capsule()
                                        .stroke((check.passes ? passColor : failColor).opacity(0.4), lineWidth: 1)))
                        }
                        .padding(10)
                        .glassCard(8)
                    }
                }
            }

            // ── Issues ───────────────────────────────────────────────────────
            if !displayIssues.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("ISSUES")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.4))
                    ForEach(displayIssues) { IssueRowView(issue: $0) }
                }
            }

            if let note = analysisNote {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(snapAccent)
                        .font(.system(size: 12, weight: .bold))
                        .padding(.top, 2)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Analysis note")
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(0.8)
                            .foregroundStyle(.white.opacity(0.45))
                        Text(note.description)
                            .font(.system(size: 12))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(glassFill)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(glassBorder, lineWidth: 1))
                )
            }

            // ── Recommendations ──────────────────────────────────────────────
            if !result.recommendations.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("RECOMMENDATIONS")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.4))
                    ForEach(result.recommendations, id: \.self) { rec in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "wand.and.sparkles")
                                .foregroundStyle(snapAccent)
                                .font(.system(size: 12))
                                .padding(.top, 2)
                            Text(rec)
                                .font(.system(size: 13))
                                .foregroundStyle(.white.opacity(0.8))
                        }
                    }
                }
            }

            // ── Start over ───────────────────────────────────────────────────
            Button(action: onDismiss) {
                Text("Start Over")
                    .font(.system(size: 15, weight: .bold))
                    .frame(maxWidth: .infinity).frame(height: 50)
                    .foregroundStyle(.black.opacity(0.85))
                    .background(LinearGradient(colors: [snapAccent, snapAccent2],
                                               startPoint: .leading, endPoint: .trailing))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
        .padding(18)
        .glassCard(18)
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func statPill(_ key: String, _ value: String) -> some View {
        HStack(spacing: 4) {
            Text(key).font(.system(size: 10)).foregroundStyle(.white.opacity(0.4))
            Text(value).font(.system(size: 10, weight: .bold)).foregroundStyle(.white.opacity(0.75))
        }
        .padding(.horizontal, 8).padding(.vertical, 4)
        .background(Capsule().fill(glassFill).overlay(Capsule().stroke(glassBorder, lineWidth: 1)))
    }
}

struct IssueRowView: View {
    let issue: ComplianceIssue

    private var severityColor: Color {
        switch issue.severity {
        case .critical: return Color(red: 1.0, green: 0.35, blue: 0.45)
        case .warning:  return Color(red: 1.0, green: 0.7,  blue: 0.2)
        case .info:     return Color(red: 0.4, green: 0.7,  blue: 1.0)
        }
    }
    private var severityIcon: String {
        switch issue.severity {
        case .critical: return "xmark.circle.fill"
        case .warning:  return "exclamationmark.triangle.fill"
        case .info:     return "info.circle.fill"
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: severityIcon)
                .foregroundStyle(severityColor)
                .font(.system(size: 14))
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 4) {
                Text(issue.description)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                if let s = issue.suggestion, !s.isEmpty {
                    Text(s)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(severityColor.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 8)
                    .stroke(severityColor.opacity(0.2), lineWidth: 1))
        )
    }
}
