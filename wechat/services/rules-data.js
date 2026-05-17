// services/rules-data.js — local fallback country rules + background presets.
// Used as a fallback when /api/rules/{code} cannot be reached. Mirrors the
// shape returned by the worker so callers don't need to branch.

const LOCAL_COUNTRY_RULES = {
  US: { id: 'us_rules', countryCode: 'US', countryName: 'United States', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  CA: { id: 'ca_rules', countryCode: 'CA', countryName: 'Canada', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  GB: { id: 'gb_rules', countryCode: 'GB', countryName: 'United Kingdom', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'LIGHT_NEUTRAL', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  DE: { id: 'de_rules', countryCode: 'DE', countryName: 'Germany', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  FR: { id: 'fr_rules', countryCode: 'FR', countryName: 'France', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: true, headCoverageAllowed: false },
  JP: { id: 'jp_rules', countryCode: 'JP', countryName: 'Japan', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  AU: { id: 'au_rules', countryCode: 'AU', countryName: 'Australia', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  CN: { id: 'cn_rules', countryCode: 'CN', countryName: 'China', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  IT: { id: 'it_rules', countryCode: 'IT', countryName: 'Italy', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  ES: { id: 'es_rules', countryCode: 'ES', countryName: 'Spain', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  NL: { id: 'nl_rules', countryCode: 'NL', countryName: 'Netherlands', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  SE: { id: 'se_rules', countryCode: 'SE', countryName: 'Sweden', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  PL: { id: 'pl_rules', countryCode: 'PL', countryName: 'Poland', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 37, height: 46, headHeight: 294 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  IN: { id: 'in_rules', countryCode: 'IN', countryName: 'India', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  SG: { id: 'sg_rules', countryCode: 'SG', countryName: 'Singapore', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  TH: { id: 'th_rules', countryCode: 'TH', countryName: 'Thailand', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  VN: { id: 'vn_rules', countryCode: 'VN', countryName: 'Vietnam', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  ID: { id: 'id_rules', countryCode: 'ID', countryName: 'Indonesia', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  PH: { id: 'ph_rules', countryCode: 'PH', countryName: 'Philippines', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
  MY: { id: 'my_rules', countryCode: 'MY', countryName: 'Malaysia', passportSize: { width: 35, height: 45, headHeight: 288 }, visaSize: { width: 35, height: 45, headHeight: 288 }, backgroundColorRequirement: 'WHITE', smileAllowed: false, glassesAllowed: false, headCoverageAllowed: false },
};

const BG_PRESETS = {
  WHITE: '#ffffff',
  OFF_WHITE: '#f8f8f8',
  LIGHT_NEUTRAL: '#f0f0f0',
  LIGHT_GREY: '#e8e8e8',
};

module.exports = { LOCAL_COUNTRY_RULES, BG_PRESETS };
