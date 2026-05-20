import SwiftUI

struct DocumentTypeSelectionView: View {
    @Binding var selectedType: DocumentType

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Document Type", systemImage: "creditcard")
                .font(.system(size: 12, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(.white.opacity(0.5))
                .textCase(.uppercase)

            HStack(spacing: 0) {
                ForEach(DocumentType.allCases, id: \.self) { type in
                    Button(action: { withAnimation(.easeInOut(duration: 0.2)) { selectedType = type } }) {
                        Text(type.displayName)
                            .font(.system(size: 14, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 46)
                            .foregroundStyle(selectedType == type ? .black.opacity(0.85) : .white.opacity(0.6))
                            .background(
                                Group {
                                    if selectedType == type {
                                        LinearGradient(colors: [snapAccent, snapAccent2],
                                                       startPoint: .leading, endPoint: .trailing)
                                    } else {
                                        Color.clear
                                    }
                                }
                            )
                    }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(glassFill)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(glassBorder, lineWidth: 1))
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    DocumentTypeSelectionView(selectedType: .constant(.passport))
}
