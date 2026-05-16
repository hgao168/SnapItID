import SwiftUI

struct ComplianceResultView: View {
    let result: ComplianceResult
    let onDismiss: () -> Void
    
    var statusColor: Color {
        result.isCompliant ? .green : .red
    }
    
    var statusText: String {
        result.isCompliant ? "Compliant" : "Not Compliant"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Compliance Check Result")
                            .font(.system(size: 18, weight: .semibold))
                        
                        Text("Processed in \(String(format: "%.2f", result.processingTime))s")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: result.isCompliant ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .font(.system(size: 20))
                            
                            Text(statusText)
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundStyle(statusColor)
                        
                        Text("\(Int(result.complianceScore))% score")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(.secondary)
                    }
                }
                
                // Score Bar
                ProgressView(value: result.complianceScore / 100)
                    .tint(result.complianceScore >= 80 ? .green : result.complianceScore >= 60 ? .orange : .red)
            }
            .padding(16)
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            // Issues
            if !result.issues.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Issues Found (\(result.issues.count))")
                        .font(.system(size: 14, weight: .semibold))
                    
                    VStack(spacing: 8) {
                        ForEach(result.issues) { issue in
                            IssueRowView(issue: issue)
                        }
                    }
                }
            }
            
            // Recommendations
            if !result.recommendations.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recommendations")
                        .font(.system(size: 14, weight: .semibold))
                    
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(result.recommendations, id: \.self) { rec in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "lightbulb.fill")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.blue)
                                    .padding(.top, 2)
                                
                                Text(rec)
                                    .font(.system(size: 13, weight: .regular))
                                    .lineLimit(3)
                            }
                        }
                    }
                }
            }
            
            // Action Button
            Button(action: onDismiss) {
                Text("Try Again")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .border(Color(.systemGray3), width: 1)
        .cornerRadius(12)
        .padding(.horizontal, 24)
    }
}

struct IssueRowView: View {
    let issue: ComplianceIssue
    
    var severityColor: Color {
        switch issue.severity {
        case .critical: return .red
        case .warning: return .orange
        case .info: return .blue
        }
    }
    
    var severityIcon: String {
        switch issue.severity {
        case .critical: return "xmark.circle.fill"
        case .warning: return "exclamationmark.circle.fill"
        case .info: return "info.circle.fill"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: severityIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(severityColor)
                    .padding(.top, 2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(issue.description)
                        .font(.system(size: 13, weight: .semibold))
                    
                    if let suggestion = issue.suggestion {
                        Text(suggestion)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

#Preview {
    let mockResult = ComplianceResult(
        id: "test",
        isCompliant: false,
        complianceScore: 75,
        issues: [
            ComplianceIssue(
                id: "1",
                severity: .warning,
                category: .headSize,
                description: "Head size is 8% too small",
                suggestion: "Move closer to camera"
            )
        ],
        recommendations: ["Ensure proper lighting", "Face camera directly"],
        processingTime: 2.5,
        timestamp: Date()
    )
    
    ComplianceResultView(result: mockResult, onDismiss: {})
}
