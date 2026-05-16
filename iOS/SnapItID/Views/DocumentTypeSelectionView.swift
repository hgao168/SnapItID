import SwiftUI

struct DocumentTypeSelectionView: View {
    @Binding var selectedType: DocumentType
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Document Type")
                .font(.system(size: 16, weight: .semibold))
            
            HStack(spacing: 12) {
                ForEach(DocumentType.allCases, id: \.self) { type in
                    Button(action: { selectedType = type }) {
                        Text(type.displayName)
                            .font(.system(size: 14, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(selectedType == type ? Color.blue : Color(.systemGray6))
                            .foregroundStyle(selectedType == type ? .white : .primary)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    DocumentTypeSelectionView(selectedType: .constant(.passport))
}
