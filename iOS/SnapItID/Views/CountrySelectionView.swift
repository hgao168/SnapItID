import SwiftUI

struct CountrySelectionView: View {
    @Binding var selectedCountry: String

    private let countries = SupportedCountries.list
    private var isSelectedPremium: Bool { SupportedCountries.isPremium(code: selectedCountry) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Country", systemImage: "globe")
                .font(.system(size: 12, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(.white.opacity(0.5))
                .textCase(.uppercase)

            Menu {
                ForEach(countries, id: \.code) { country in
                    Button {
                        selectedCountry = country.code
                    } label: {
                        Text(country.name + (SupportedCountries.isPremium(code: country.code) ? " ✨" : ""))
                    }
                }
            } label: {
                HStack {
                    Text(SupportedCountries.name(for: selectedCountry))
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white)
                    if isSelectedPremium {
                        Text("PREMIUM")
                            .font(.system(size: 9, weight: .bold))
                            .tracking(0.8)
                            .foregroundStyle(snapAccent)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Capsule().fill(snapAccent.opacity(0.15))
                                .overlay(Capsule().stroke(snapAccent.opacity(0.4), lineWidth: 1)))
                    }
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.5))
                }
                .padding(.horizontal, 14)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .glassCard(12)
            }

            if isSelectedPremium {
                HStack(spacing: 6) {
                    Image(systemName: "lock.fill").font(.system(size: 10))
                    Text("Upgrade to Premium to unlock all countries")
                        .font(.system(size: 12))
                }
                .foregroundStyle(snapAccent.opacity(0.8))
                .padding(.horizontal, 2)
            }
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    CountrySelectionView(selectedCountry: .constant("US"))
}
