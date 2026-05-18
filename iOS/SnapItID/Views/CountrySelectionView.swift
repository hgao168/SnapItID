import SwiftUI

struct CountrySelectionView: View {
    @Binding var selectedCountry: String

    private let countries = SupportedCountries.list
    private var isSelectedPremium: Bool { SupportedCountries.isPremium(code: selectedCountry) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Country")
                .font(.system(size: 16, weight: .semibold))

            Menu {
                ForEach(countries, id: \.code) { country in
                    Button {
                        selectedCountry = country.code
                    } label: {
                        Text(country.name + (SupportedCountries.isPremium(code: country.code) ? " ✨ Premium" : ""))
                    }
                }
            } label: {
                HStack {
                    Text(SupportedCountries.name(for: selectedCountry))
                        .font(.system(size: 16))
                    if isSelectedPremium {
                        Text("✨ Premium")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.orange)
                    }
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

            if isSelectedPremium {
                HStack(spacing: 6) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 11))
                    Text("Unlock all countries by upgrading to ✨ Premium")
                        .font(.system(size: 12))
                }
                .foregroundStyle(.orange)
                .padding(.horizontal, 4)
            }
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    CountrySelectionView(selectedCountry: .constant("US"))
}
