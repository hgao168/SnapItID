import SwiftUI

struct ComplianceResultView: View {
    let result: ComplianceResult
    let rules: CountryRules?
    let onDismiss: () -> Void

    init(result: ComplianceResult, rules: CountryRules? = nil, onDismiss: @escaping () -> Void) {
        self.result = result
        self.rules = rules
        self.onDismiss = onDismiss
    }

    private struct RuleCheck { let label: String; let passes: Bool }
    private var ruleChecks: [RuleCheck] {
        var checks: [RuleCheck] = []
        guard let rules else { return checks }
        if !rules.smileAllowed {
            let failed = result.issues.contains { $0.category == .smileDetection && $0.severity == .critical }
            checks.append(RuleCheck(label: "No Smile", passes: !failed))
        }
        if !rules.headCoverageAllowed {
            let failed = result.issues.contains { $0.category == .headCoverForbidden && $0.severity == .critical }
            checks.append(RuleCheck(label: "No Head Cover", passes: !failed))
        }
        return checks
    }

    private var statusColor: Color { result.isCompliant ? .green : .red }
    private var statusText: String { result.isCompliant ? "PASS" : "ATTENTION NEEDED" }

    private var scoreColor: Color {
        if result.complianceScore >= 90 { return .green }
        if result.complianceScore >= 75 { return .orange }
        return .red
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Summary card
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Compliance result").font(.system(size: 16, weight: .semibold))
                        Text("Processed in \(String(format: "%.2f", result.processingTime))s")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: result.isCompliant ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                            Text(statusText).font(.system(size: 14, weight: .bold))
                        }
                        .foregroundStyle(statusColor)
                        Text("Score \(Int(result.complianceScore))/100")
                            .font(.system(size: 12)).foregroundStyle(.secondary)
                    }
                }

                ProgressView(value: result.complianceScore / 100).tint(scoreColor)

                HStack(spacing: 16) {
                    pill("Confidence", result.confidenceLabel)
                    pill("Issues", "\(result.issues.count)")
                }
            }
            .padding(14)
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // Rule checks (No Smile, No Head Cover)
            if !ruleChecks.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Rule checks").font(.system(size: 14, weight: .semibold))
                    ForEach(ruleChecks, id: \.label) { check in
                        HStack(spacing: 10) {
                            Image(systemName: check.passes ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(check.passes ? .green : .red)
                                .font(.system(size: 14))
                            Text(check.label).font(.system(size: 13, weight: .semibold))
                            Spacer()
                            Text(check.passes ? "PASS" : "FAIL")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(check.passes ? .green : .red)
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(check.passes ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
                                .cornerRadius(4)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
            }

            // Issues
            if !result.issues.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Issues found").font(.system(size: 14, weight: .semibold))
                    ForEach(result.issues) { IssueRowView(issue: $0) }
                }
            }

            // Recommendations
            if !result.recommendations.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Recommendations").font(.system(size: 14, weight: .semibold))
                    ForEach(result.recommendations, id: \.self) { rec in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "lightbulb.fill")
                                .foregroundStyle(.blue)
                                .font(.system(size: 12))
                                .padding(.top, 2)
                            Text(rec).font(.system(size: 13))
                        }
                    }
                }
            }

            Button(action: onDismiss) {
                Text("Start over")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity).frame(height: 48)
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(10)
            }
        }
        .padding(18)
        .background(Color(.systemBackground))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray4), lineWidth: 1))
        .cornerRadius(12)
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func pill(_ key: String, _ value: String) -> some View {
        HStack(spacing: 6) {
            Text(key).font(.system(size: 11)).foregroundStyle(.secondary)
            Text(value).font(.system(size: 11, weight: .bold))
        }
        .padding(.horizontal, 10).padding(.vertical, 5)
        .background(Color(.systemBackground))
        .overlay(Capsule().stroke(Color(.systemGray4), lineWidth: 1))
        .clipShape(Capsule())
    }
}

struct IssueRowView: View {
    let issue: ComplianceIssue

    private var severityColor: Color {
        switch issue.severity {
        case .critical: return .red
        case .warning:  return .orange
        case .info:     return .blue
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
                Text(issue.description).font(.system(size: 13, weight: .semibold))
                if let s = issue.suggestion, !s.isEmpty {
                    Text(s).font(.system(size: 12)).foregroundStyle(.secondary)
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
