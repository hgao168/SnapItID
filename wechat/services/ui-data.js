// services/ui-data.js — page-level picker data and human-readable labels.
// Kept separate from rules-data.js so display-only strings can evolve
// without touching the rules contract.

const COUNTRIES = [
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'CN', label: '🇨🇳 China' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'ID', label: '🇮🇩 Indonesia' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'IT', label: '🇮🇹 Italy' },
  { code: 'JP', label: '🇯🇵 Japan' },
  { code: 'MY', label: '🇲🇾 Malaysia' },
  { code: 'NL', label: '🇳🇱 Netherlands' },
  { code: 'PH', label: '🇵🇭 Philippines' },
  { code: 'PL', label: '🇵🇱 Poland' },
  { code: 'SE', label: '🇸🇪 Sweden' },
  { code: 'SG', label: '🇸🇬 Singapore' },
  { code: 'TH', label: '🇹🇭 Thailand' },
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'VN', label: '🇻🇳 Vietnam' },
];

const DOCS = [
  { code: 'PASSPORT', label: 'Passport' },
  { code: 'VISA',     label: 'Visa' },
];

const BG_LABELS = {
  WHITE: 'White',
  OFF_WHITE: 'Off-white',
  LIGHT_NEUTRAL: 'Light neutral / cream',
  LIGHT_GREY: 'Light grey',
};

module.exports = { COUNTRIES, DOCS, BG_LABELS };
