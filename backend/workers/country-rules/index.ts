/**
 * Country Rules Worker
 * Serves country-specific photo requirements
 * 
 * Endpoints:
 * GET /api/rules/{countryCode}
 */

interface PhotoSize {
  width: number; // mm
  height: number; // mm
  headHeight: number; // pixels at standard resolution
}

interface CountryRules {
  id: string;
  countryCode: string;
  countryName: string;
  passportSize: PhotoSize;
  visaSize: PhotoSize;
  backgroundColorRequirement: string;
  smileAllowed: boolean;
  glassesAllowed: boolean;
  headCoverageAllowed: boolean;
  minResolution: number; // megapixels
  printFormat: string;
  lastUpdated: string;
}

// Rules database (MVP - hardcoded, should be stored in KV/D1)
const COUNTRY_RULES: Record<string, CountryRules> = {
  US: {
    id: 'us_rules',
    countryCode: 'US',
    countryName: 'United States',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  CA: {
    id: 'ca_rules',
    countryCode: 'CA',
    countryName: 'Canada',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  GB: {
    id: 'gb_rules',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'LIGHT_NEUTRAL',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 2,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  DE: {
    id: 'de_rules',
    countryCode: 'DE',
    countryName: 'Germany',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  FR: {
    id: 'fr_rules',
    countryCode: 'FR',
    countryName: 'France',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: true,
    headCoverageAllowed: false,
    minResolution: 2,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  JP: {
    id: 'jp_rules',
    countryCode: 'JP',
    countryName: 'Japan',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  AU: {
    id: 'au_rules',
    countryCode: 'AU',
    countryName: 'Australia',
    passportSize: {
      width: 35,
      height: 45,
      headHeight: 288,
    },
    visaSize: {
      width: 37,
      height: 46,
      headHeight: 294,
    },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  IT: {
    id: 'it_rules',
    countryCode: 'IT',
    countryName: 'Italy',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 37, height: 46, headHeight: 294 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  ES: {
    id: 'es_rules',
    countryCode: 'ES',
    countryName: 'Spain',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 37, height: 46, headHeight: 294 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  NL: {
    id: 'nl_rules',
    countryCode: 'NL',
    countryName: 'Netherlands',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 37, height: 46, headHeight: 294 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  SE: {
    id: 'se_rules',
    countryCode: 'SE',
    countryName: 'Sweden',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 37, height: 46, headHeight: 294 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  PL: {
    id: 'pl_rules',
    countryCode: 'PL',
    countryName: 'Poland',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 37, height: 46, headHeight: 294 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  CN: {
    id: 'cn_rules',
    countryCode: 'CN',
    countryName: 'China',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  IN: {
    id: 'in_rules',
    countryCode: 'IN',
    countryName: 'India',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  SG: {
    id: 'sg_rules',
    countryCode: 'SG',
    countryName: 'Singapore',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  TH: {
    id: 'th_rules',
    countryCode: 'TH',
    countryName: 'Thailand',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  VN: {
    id: 'vn_rules',
    countryCode: 'VN',
    countryName: 'Vietnam',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  ID: {
    id: 'id_rules',
    countryCode: 'ID',
    countryName: 'Indonesia',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  PH: {
    id: 'ph_rules',
    countryCode: 'PH',
    countryName: 'Philippines',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
  MY: {
    id: 'my_rules',
    countryCode: 'MY',
    countryName: 'Malaysia',
    passportSize: { width: 35, height: 45, headHeight: 288 },
    visaSize: { width: 35, height: 45, headHeight: 288 },
    backgroundColorRequirement: 'WHITE',
    smileAllowed: false,
    glassesAllowed: false,
    headCoverageAllowed: false,
    minResolution: 3,
    printFormat: '4x6',
    lastUpdated: new Date().toISOString(),
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    try {
      const match = path.match(/^\/api\/rules\/([A-Z]{2})$/);
      if (match && request.method === 'GET') {
        const countryCode = match[1];
        return handleGetRules(countryCode);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Internal error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

function handleGetRules(countryCode: string): Response {
  const rules = COUNTRY_RULES[countryCode];

  if (!rules) {
    return new Response(
      JSON.stringify({ error: `Rules not found for country: ${countryCode}` }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      result: rules,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    }
  );
}

interface Env {
  // Add environment variables here if needed
}
