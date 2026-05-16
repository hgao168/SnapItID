import SwiftUI

struct CountrySelectionView: View {
    @Binding var selectedCountry: String
    
    let countries = [
        ("US", "United States"),
        ("CA", "Canada"),
        ("GB", "United Kingdom"),
        ("DE", "Germany"),
        ("FR", "France"),
        ("JP", "Japan"),
        ("AU", "Australia"),
        ("NZ", "New Zealand"),
        ("SG", "Singapore"),
        ("CN", "China"),
        ("IN", "India"),
        ("BR", "Brazil"),
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Country")
                .font(.system(size: 16, weight: .semibold))
            
            Menu {
                ForEach(countries, id: \.0) { code, name in
                    Button(name) {
                        selectedCountry = code
                    }
                }
            } label: {
                HStack {
                    Text(countryName(for: selectedCountry))
                        .font(.system(size: 16, weight: .regular))
                    
                    Spacer()
                    
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .padding(.horizontal, 12)
                .foregroundStyle(.primary)
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
        }
        .padding(.horizontal, 24)
    }
    
    private func countryName(for code: String) -> String {
        countries.first { $0.0 == code }?.1 ?? code
    }
}

#Preview {
    CountrySelectionView(selectedCountry: .constant("US"))
}
