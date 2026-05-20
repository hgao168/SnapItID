/**
 * SnapItID Compliance Check Worker
 * Runs on Cloudflare Workers to validate identity photos
 * 
 * Endpoints:
 * POST /api/compliance/check
 */

interface CountryRules {
  glassesAllowed: boolean;
  smileAllowed: boolean;
  headCoverageAllowed: boolean;
}

interface ComplianceRequest {
  photoID?: string;
  countryCode: string;
  documentType: string;
  imageBase64?: string; // optional data URL or raw base64 sent directly from the client
  rules?: CountryRules;
}

type UserTier = 'free' | 'pro' | 'lifetime';


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

      if (path === '/api/compliance/enhance' && request.method === 'POST') {
        return await handleEnhance(request, env);
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
    const { photoID, countryCode, documentType, imageBase64, rules } = body;

    // Validate input
    if ((!photoID && !imageBase64) || !countryCode || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prefer inline image; fall back to Cloudflare Images by ID.
    const imageData = imageBase64
      ? decodeBase64Image(imageBase64)
      : await fetchImageFromCloudflare(photoID as string, env);

    const complianceIssues = await runComplianceAnalysis(
      imageData,
      countryCode,
      documentType,
      env,
      rules
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
 * Decode a base64-encoded image (with or without a data URL prefix) into bytes.
 */
function decodeBase64Image(input: string): Uint8Array {
  const commaIdx = input.indexOf(',');
  const b64 = commaIdx >= 0 && input.startsWith('data:') ? input.slice(commaIdx + 1) : input;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Fetch image from Cloudflare Images
 */
async function fetchImageFromCloudflare(
  imageID: string,
  env: Env
): Promise<Uint8Array> {
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
  return new Uint8Array(buffer);
}

/**
 * Run AI compliance analysis on photo using Cloudflare Workers AI (vision model).
 */
async function runComplianceAnalysis(
  imageData: Uint8Array,
  countryCode: string,
  documentType: string,
  env: Env,
  rules?: CountryRules
): Promise<ComplianceIssue[]> {
  const issues: ComplianceIssue[] = [];

  // Ask a vision-language model to assess ICAO-like passport photo compliance.
  // Note: we keep the glasses question NEUTRAL — biased prompts caused frequent
  // false positives, especially on AI-enhanced photos with strong eye contours.
  const prompt =
    `You are an ICAO-style passport photo compliance checker for ${countryCode} ${documentType}. ` +
    `Evaluate the photo objectively. ` +
    `Set "glasses" to true ONLY if you can clearly see physical eyeglass frames, rims, lenses, ` +
    `or temple arms on the face. Do NOT infer glasses from eye shape, eyelid creases, wrinkles, ` +
    `eyebrows, or shadows. When unsure, set glasses to false. ` +
    `Reply ONLY with compact JSON of the form ` +
    `{"face_detected":bool,"single_face":bool,"facing_forward":bool,"eyes_open":bool,` +
    `"neutral_expression":bool,"mouth_closed":bool,"glasses":bool,"glasses_glare":bool,` +
    `"head_covering":bool,"shadows_on_face":bool,"plain_background":bool,` +
    `"background_uniform_color":bool,"head_size_ok":bool,"image_sharp":bool,` +
    `"notes":string}. Do not include any prose outside JSON.`;

  let parsed: Record<string, unknown> | null = null;
  try {
    const aiResponse: any = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: Array.from(imageData),
      prompt,
      max_tokens: 512,
    });
    const text: string = typeof aiResponse === 'string'
      ? aiResponse
      : (aiResponse?.description ?? aiResponse?.response ?? aiResponse?.text ?? '');
    parsed = extractJSON(text);
  } catch (err) {
    issues.push({
      id: 'ai_unavailable',
      severity: 'WARNING',
      category: 'AI_SERVICE',
      description: 'AI vision model unavailable: ' + (err instanceof Error ? err.message : 'unknown'),
    });
  }

  // Second-opinion pass for glasses: only confirm a glasses flag if a focused
  // yes/no question also says yes. This eliminates the dominant false-positive
  // pattern we saw where the model flagged glasses on clean enhanced photos.
  if (parsed && asBool(parsed.glasses, false)) {
    try {
      const confirmResp: any = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        image: Array.from(imageData),
        prompt:
          'Look at this face. Are there any physical eyeglasses, spectacles, sunglasses, or ' +
          'eyewear with visible frames, rims, lenses, or temple arms on or in front of the eyes? ' +
          'Answer ONLY with the single word YES or NO.',
        max_tokens: 8,
      });
      const confirmText: string = typeof confirmResp === 'string'
        ? confirmResp
        : (confirmResp?.description ?? confirmResp?.response ?? confirmResp?.text ?? '');
      const confirmed = /\byes\b/i.test(confirmText) && !/\bno\b/i.test(confirmText);
      if (!confirmed) {
        parsed.glasses = false;
        parsed.glasses_glare = false;
      }
    } catch {
      // If confirmation fails, be conservative and drop the glasses flag to
      // avoid blocking otherwise compliant photos on a single shaky signal.
      parsed.glasses = false;
      parsed.glasses_glare = false;
    }
  }

  if (parsed) {
    mapAIFindingsToIssues(parsed, issues, rules);
  } else if (issues.length === 0) {
    issues.push({
      id: 'ai_parse',
      severity: 'INFO',
      category: 'AI_SERVICE',
      description: 'AI analysis was partial, so only rule-based checks were used for this photo.',
    });
  }

  // Lightweight non-AI checks (image size, payload sanity).
  const sizeIssue = checkPayloadSize(imageData);
  if (sizeIssue) issues.push(sizeIssue);

  return issues;
}

/**
 * Try to extract the first JSON object from a text blob.
 */
function extractJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asBool(v: unknown, fallback = true): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return /^(true|yes|1)$/i.test(v.trim());
  return fallback;
}

function mapAIFindingsToIssues(
  a: Record<string, unknown>,
  issues: ComplianceIssue[],
  rules?: CountryRules
): void {
  if (!asBool(a.face_detected)) {
    issues.push({ id: 'face_missing', severity: 'CRITICAL', category: 'FACE', description: 'No face detected in the photo.' });
  }
  if (asBool(a.face_detected) && !asBool(a.single_face)) {
    issues.push({ id: 'multi_face', severity: 'CRITICAL', category: 'FACE', description: 'More than one face detected.' });
  }
  if (!asBool(a.facing_forward)) {
    issues.push({ id: 'not_forward', severity: 'CRITICAL', category: 'EYE_POSITION', description: 'Subject is not facing the camera directly.' });
  }
  if (!asBool(a.eyes_open)) {
    issues.push({ id: 'eyes_closed', severity: 'CRITICAL', category: 'EYE_POSITION', description: 'Eyes are not fully open.' });
  }
  if (!asBool(a.neutral_expression) || !asBool(a.mouth_closed)) {
    issues.push({ id: 'expression', severity: 'WARNING', category: 'SMILE_DETECTED', description: 'Expression is not neutral with mouth closed.' });
  }
  // Glasses: flag as CRITICAL if detected and country rule forbids them; otherwise flag glare.
  if (asBool(a.glasses, false)) {
    if (rules && rules.glassesAllowed === false) {
      issues.push({ id: 'glasses_forbidden', severity: 'CRITICAL', category: 'GLASSES_FORBIDDEN', description: 'Glasses are not allowed for this country/document type. Please remove glasses.', suggestion: 'Remove glasses and retake the photo, or use AI Enhance to remove them.' });
    } else if (asBool(a.glasses_glare, false)) {
      issues.push({ id: 'glare', severity: 'WARNING', category: 'GLASSES_REFLECTION', description: 'Glare detected on glasses.' });
    }
  }
  // Head covering: CRITICAL if country forbids it, WARNING otherwise.
  if (asBool(a.head_covering, false)) {
    if (rules && rules.headCoverageAllowed === false) {
      issues.push({ id: 'head_cover_forbidden', severity: 'CRITICAL', category: 'HEAD_COVER_FORBIDDEN', description: 'Head covering is not allowed for this country/document type.' });
    } else {
      issues.push({ id: 'head_cover', severity: 'WARNING', category: 'HEAD_COVER_FORBIDDEN', description: 'Head covering detected (allowed only for religious reasons in some countries).' });
    }
  }
  if (asBool(a.shadows_on_face, false)) {
    issues.push({ id: 'shadows', severity: 'WARNING', category: 'SHADOW_DETECTED', description: 'Shadows visible on the face.' });
  }
  if (!asBool(a.plain_background) || !asBool(a.background_uniform_color)) {
    issues.push({ id: 'bg', severity: 'WARNING', category: 'BACKGROUND', description: 'Background is not plain / uniform.' });
  }
  if (!asBool(a.head_size_ok)) {
    issues.push({ id: 'head_size', severity: 'WARNING', category: 'HEAD_SIZE', description: 'Head size appears outside the required range.' });
  }
  if (!asBool(a.image_sharp)) {
    issues.push({ id: 'sharpness', severity: 'WARNING', category: 'EXPOSURE', description: 'Image is blurry or not sharp.' });
  }
}

function checkPayloadSize(imageData: Uint8Array): ComplianceIssue | null {
  if (imageData.byteLength < 5_000) {
    return {
      id: 'too_small',
      severity: 'WARNING',
      category: 'RESOLUTION',
      description: 'Image payload is unusually small; resolution may be too low.',
    };
  }
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
  if (categories.has('BACKGROUND')) {
    recommendations.push('Use a plain white or light neutral background');
  }
  if (categories.has('SHADOW_DETECTED')) {
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
 * Handle AI photo enhancement via OpenAI gpt-image-2.
 * Takes a base64 image and re-renders it as a compliant ID photo.
 */
async function handleEnhance(request: Request, env: Env): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured on worker.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  let body: { imageBase64?: string; countryCode?: string; documentType?: string; rules?: CountryRules };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const {
    imageBase64,
    countryCode = '',
    documentType = 'PASSPORT',
    rules,
  } = body;
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64Image(imageBase64);
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to decode image' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const removeGlasses = rules && rules.glassesAllowed === false;
  // Extract tier from JWT token in Authorization header
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const userTier = extractTierFromToken(token);
  const shouldWatermark = userTier === 'free';
  const prompt =
    `Replace ONLY the background with a plain pure-white background (#FFFFFF). ` +
    (removeGlasses
      ? `CRITICAL REQUIREMENT: The subject must NOT be wearing any glasses, spectacles, eyeglasses, sunglasses, or any other eyewear in the output. ` +
        `If the subject is currently wearing glasses, you MUST remove them completely. ` +
        `Render the natural eyes, eyebrows, and skin around the eye area as they would look without glasses — no frame marks, no lens reflections, no temple arms. ` +
        `This is mandatory because the destination country forbids glasses in passport photos. `
      : `Do NOT change the person's glasses if they are wearing any. `) +
    `Do NOT change the person in any other way — do NOT alter their face shape, skin tone, facial structure, ` +
    `eye shape, eye colour, nose, mouth, jawline, ears, hair colour, hairstyle, wrinkles, expression, ` +
    `clothing, or body proportions. The person must remain 100% identical and recognisable. ` +
    (shouldWatermark
      ? `Add a clearly visible watermark text "SnapItID FREE PREVIEW" diagonally across the image. ` +
        `The watermark should be semi-transparent but readable, and must remain inside the image bounds. `
      : `Do NOT add any watermark, text, logo, brand mark, or overlay on the output image. `) +
    `Only remove any existing background and fill it with solid white. ` +
    `Optionally soften any harsh shadows on the white background area only. ` +
    `This is for a ${countryCode || 'international'} ${documentType.toLowerCase()} ID photo.`;

  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'photo.png');
  form.append('model', 'gpt-image-2');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('n', '1');
  form.append('quality', 'low');

  let openaiResp: Response;
  try {
    openaiResp = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'OpenAI request failed: ' + (err instanceof Error ? err.message : 'unknown') }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const data = (await openaiResp.json().catch(() => ({}))) as any;
  if (!openaiResp.ok) {
    const msg = data?.error?.message || `OpenAI returned ${openaiResp.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    return new Response(JSON.stringify({ error: 'OpenAI returned no image data' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      result: {
        imageBase64: `data:image/png;base64,${b64}`,
        model: 'gpt-image-2',
        tier: userTier,
        watermarked: shouldWatermark,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  );
}

function extractTierFromToken(token: string): UserTier {
  if (!token) return 'free';
  
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return 'free';
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    if (payload.tier === 'pro' || payload.tier === 'lifetime') {
      return payload.tier;
    }
  } catch {
    // If any error in token parsing/decoding, default to free tier
  }
  
  return 'free';
}

/**
 * Environment type definition
 */
interface Env {
  SNAPITID_KV: KVNamespace;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  AI: Ai;
  OPENAI_API_KEY: string;
}
