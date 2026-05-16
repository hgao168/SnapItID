/**
 * SnapItID Compliance Check Worker
 * Runs on Cloudflare Workers to validate identity photos
 * 
 * Endpoints:
 * POST /api/compliance/check
 */

interface ComplianceRequest {
  photoID: string;
  countryCode: string;
  documentType: string;
}

interface ComplianceIssue {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: string;
  description: string;
  suggestion?: string;
}

interface ComplianceResult {
  id: string;
  isCompliant: boolean;
  complianceScore: number;
  issues: ComplianceIssue[];
  recommendations: string[];
  processingTime: number;
  timestamp: string;
}

/**
 * Main worker handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      if (path === '/api/compliance/check' && request.method === 'POST') {
        return await handleComplianceCheck(request, env);
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

/**
 * Handle compliance check request
 */
async function handleComplianceCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as ComplianceRequest;
    const { photoID, countryCode, documentType } = body;

    // Validate input
    if (!photoID || !countryCode || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch image from Cloudflare Images
    const imageData = await fetchImageFromCloudflare(photoID, env);

    // Run AI compliance check using Vision API (via Cloudflare)
    const complianceIssues = await runComplianceAnalysis(
      imageData,
      countryCode,
      documentType,
      env
    );

    // Calculate score
    const criticalCount = complianceIssues.filter(
      (i) => i.severity === 'CRITICAL'
    ).length;
    const warningCount = complianceIssues.filter(
      (i) => i.severity === 'WARNING'
    ).length;

    const baseScore = 100;
    const score = Math.max(
      0,
      baseScore - criticalCount * 30 - warningCount * 10
    );
    const isCompliant = score >= 75;

    // Generate recommendations
    const recommendations = generateRecommendations(complianceIssues);

    const result: ComplianceResult = {
      id: generateID(),
      isCompliant,
      complianceScore: score,
      issues: complianceIssues,
      recommendations,
      processingTime: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
    };

    // Store result in Cloudflare KV
    await env.SNAPITID_KV.put(result.id, JSON.stringify(result), {
      expirationTtl: 86400 * 30, // 30 days
    });

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Processing failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Fetch image from Cloudflare Images
 */
async function fetchImageFromCloudflare(
  imageID: string,
  env: Env
): Promise<Buffer> {
  const response = await fetch(
    `https://imagedelivery.net/${env.CLOUDFLARE_ACCOUNT_ID}/${imageID}/original`,
    {
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch image');
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

/**
 * Run AI compliance analysis on photo
 */
async function runComplianceAnalysis(
  imageData: Buffer,
  countryCode: string,
  documentType: string,
  env: Env
): Promise<ComplianceIssue[]> {
  const issues: ComplianceIssue[] = [];

  // In production, you would call:
  // 1. Cloudflare Workers AI for vision analysis
  // 2. Your own ML model via API
  // 3. ICAO biometric standards validation

  // For MVP, we'll use basic checks
  const checks = [
    checkFaceDetection(imageData),
    checkHeadSize(imageData),
    checkEyePosition(imageData),
    checkBackgroundQuality(imageData),
    await checkResolution(imageData),
  ];

  for (const check of checks) {
    const result = await Promise.resolve(check);
    if (result) {
      issues.push(result);
    }
  }

  return issues;
}

/**
 * Basic compliance checks (MVP version)
 * In production, these would use ML models
 */
function checkFaceDetection(imageData: Buffer): ComplianceIssue | null {
  // TODO: Implement face detection using CloudflareAI or API
  return null;
}

function checkHeadSize(imageData: Buffer): ComplianceIssue | null {
  // TODO: Implement head size validation
  return null;
}

function checkEyePosition(imageData: Buffer): ComplianceIssue | null {
  // TODO: Implement eye position validation
  return null;
}

function checkBackgroundQuality(imageData: Buffer): ComplianceIssue | null {
  // TODO: Implement background quality check
  return null;
}

async function checkResolution(imageData: Buffer): Promise<ComplianceIssue | null> {
  // TODO: Implement resolution check
  return null;
}

/**
 * Generate recommendations based on issues
 */
function generateRecommendations(issues: ComplianceIssue[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(issues.map((i) => i.category));

  if (categories.has('HEAD_SIZE')) {
    recommendations.push('Move closer to camera to increase head size');
  }
  if (categories.has('EYE_POSITION')) {
    recommendations.push('Look directly at the camera with eyes open');
  }
  if (categories.has('BACKGROUND_DETECTED')) {
    recommendations.push('Use a plain white or light neutral background');
  }
  if (categories.has('LIGHTING')) {
    recommendations.push('Ensure proper lighting without shadows on face');
  }
  if (categories.has('GLASSES_REFLECTION')) {
    recommendations.push('Adjust glasses position to eliminate glare');
  }

  return recommendations.slice(0, 3); // Return top 3
}

/**
 * Generate unique ID
 */
function generateID(): string {
  return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Environment type definition
 */
interface Env {
  SNAPITID_KV: KVNamespace;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}
