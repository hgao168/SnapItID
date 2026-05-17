import SwiftUI

struct CountrySelectionView: View {
    @Binding var selectedCountry: String

    private let countries = SupportedCountries.list

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Country")
                .font(.system(size: 16, weight: .semibold))

            Menu {
                ForEach(countries, id: \.code) { country in
                    Button(country.name) {
                        selectedCountry = country.code
                    }
                }
            } label: {
                HStack {
                    Text(SupportedCountries.name(for: selectedCountry))
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
}

#Preview {
    CountrySelectionView(selectedCountry: .constant("US"))
}
