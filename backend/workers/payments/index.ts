/**
 * SnapItID Payments Worker
 *
 * Endpoints:
 * POST /api/payments/register         { email, password, name } → { id, token, tier }
 * POST /api/payments/login            { email, password } → { id, token, tier }
 * POST /api/payments/logout           (requires Authorization header)
 * GET  /api/payments/me               (requires Authorization header)
 * POST /api/payments/forgot-password  { email } → sends reset email
 * POST /api/payments/reset-password   { token, password }
 * POST /api/payments/register-guest   (anonymous, no password)
 * POST /api/payments/ios/activate      (requires Authorization header)
 * GET  /api/payments/checkout?provider=stripe|paypal|wechat&plan=single|pro|lifetime&country=US&docType=PASSPORT&success_url=...&cancel_url=...&user_id=usr_xxx
 * POST /api/payments/guest
 * GET  /api/payments/user?userId=usr_xxx|email=user@example.com
 * GET  /api/payments/status?id=pay_xxx
 * POST /api/payments/confirm
 */

type PaymentProvider = "stripe" | "paypal" | "wechat";
type BillingPlan = "single" | "pro" | "lifetime";
type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";
type UserTier = "free" | "pro" | "lifetime";

interface PlanInfo {
  amount: number;
  currency: string;
  label: string;
}

interface PaymentSession {
  id: string;
  provider: PaymentProvider;
  plan: BillingPlan;
  amount: number;
  currency: string;
  country: string;
  docType: string;
  userId: string | null;
  status: PaymentStatus;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
  lastPaymentAt?: string;
  lastPaymentSessionId?: string;
}

interface JwtPayload {
  id: string;
  email: string;
  tier: UserTier;
  iat: number;
  exp: number;
}

interface AppleActivationRecord {
  transactionId: string;
  originalTransactionId?: string;
  userId: string;
  plan: "pro" | "lifetime";
  activatedAt: string;
}

interface Env {
  SNAPITID_KV: any; // KVNamespace

  // App + email delivery
  APP_BASE_URL?: string;
  RESEND_API_KEY?: string;
  RESET_EMAIL_FROM?: string;
  RESET_EMAIL_REPLY_TO?: string;

  // Stripe dynamic checkout
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID_SINGLE?: string;
  STRIPE_PRICE_ID_PRO?: string;
  STRIPE_PRICE_ID_LIFETIME?: string;

  // Stripe hosted links fallback
  STRIPE_PAYMENT_LINK_SINGLE?: string;
  STRIPE_PAYMENT_LINK_PRO?: string;
  STRIPE_PAYMENT_LINK_LIFETIME?: string;

  // PayPal dynamic checkout
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_API_BASE?: string; // default: https://api-m.paypal.com

  // PayPal hosted links fallback
  PAYPAL_PAYMENT_LINK_SINGLE?: string;
  PAYPAL_PAYMENT_LINK_PRO?: string;
  PAYPAL_PAYMENT_LINK_LIFETIME?: string;

  // WeChat hosted payment URLs
  WECHAT_PAY_URL_SINGLE?: string;
  WECHAT_PAY_URL_PRO?: string;
  WECHAT_PAY_URL_LIFETIME?: string;

  // Optional shared secret for manual confirm endpoint
  PAYMENT_CONFIRM_SECRET?: string;

  // Stripe webhook signing secret
  STRIPE_WEBHOOK_SECRET?: string;

  // JWT authentication
  JWT_SECRET?: string;
}

const PLAN_TABLE: Record<BillingPlan, PlanInfo> = {
  single: { amount: 2.99, currency: "USD", label: "Single Export" },
  pro: { amount: 4.99, currency: "USD", label: "Pro Monthly" },
  lifetime: { amount: 24.99, currency: "USD", label: "Lifetime" },
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Confirm-Secret",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/payments/login" && request.method === "POST") {
        return await handleLogin(request, env);
      }

      if (path === "/api/payments/me" && request.method === "GET") {
        return await handleMe(request, env);
      }

      if (path === "/api/payments/logout" && request.method === "POST") {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }

        if (path === "/api/payments/forgot-password" && request.method === "POST") {
          return await handleForgotPassword(request, env);
        }

        if (path === "/api/payments/reset-password" && request.method === "POST") {
          return await handleResetPassword(request, env);
        }

      if (path === "/api/payments/checkout" && request.method === "GET") {
        return await handleCheckout(request, url, env);
      }

      if (path === "/api/payments/ios/activate" && request.method === "POST") {
        return await handleIOSActivate(request, env);
      }

      if (path === "/api/payments/register" && request.method === "POST") {
        return await handleRegister(request, env);
      }

      if (path === "/api/payments/guest" && request.method === "POST") {
        return await handleGuest(request, env);
      }

      if (path === "/api/payments/user" && request.method === "GET") {
        return await handleUserLookup(url, env);
      }

      if (path === "/api/payments/status" && request.method === "GET") {
        return await handleStatus(url, env);
      }

      if (path === "/api/payments/confirm" && request.method === "POST") {
        return await handleConfirm(request, env);
      }

      if (path === "/api/payments/webhook" && request.method === "POST") {
        return await handleWebhook(request, env);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "Internal error" },
        500
      );
    }
  },
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function parseProvider(input: string | null): PaymentProvider | null {
  if (!input) return null;
  const v = input.toLowerCase();
  if (v === "stripe" || v === "paypal" || v === "wechat") return v;
  return null;
}

function parsePlan(input: string | null): BillingPlan | null {
  if (!input) return null;
  const v = input.toLowerCase();
  if (v === "single" || v === "pro" || v === "lifetime") return v;
  return null;
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sessionKey(id: string): string {
  return `payments:${id}`;
}

function userKey(id: string): string {
  return `users:${id}`;
}

function userEmailKey(email: string): string {
  return `user_by_email:${normalizeEmail(email)}`;
}

function appleActivationKey(transactionId: string): string {
  return `apple_activation:${transactionId}`;
}

function getAppBaseUrl(env: Env): string {
  return (env.APP_BASE_URL || "https://snapitid.ai").replace(/\/$/, "");
}

function buildResetLink(env: Env, token: string): string {
  const base = getAppBaseUrl(env);
  return `${base}/reset-password.html?token=${encodeURIComponent(token)}`;
}

function generateSecureToken(bytes = 32): string {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  return Array.from(raw, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function getUserById(env: Env, userId: string): Promise<UserRecord | null> {
  if (!userId) return null;
  const raw = await env.SNAPITID_KV.get(userKey(userId));
  if (!raw) return null;
  return JSON.parse(raw) as UserRecord;
}

async function getUserByEmail(env: Env, email: string): Promise<UserRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const userId = await env.SNAPITID_KV.get(userEmailKey(normalized));
  if (!userId) return null;
  return await getUserById(env, userId);
}

async function saveUser(env: Env, user: UserRecord): Promise<void> {
  await env.SNAPITID_KV.put(userKey(user.id), JSON.stringify(user));
  await env.SNAPITID_KV.put(userEmailKey(user.email), user.id);
}

async function sendPasswordResetEmail(env: Env, user: UserRecord, resetLink: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESET_EMAIL_FROM) {
    throw new Error("Password reset email is not configured on the server.");
  }

  const text = [
    `Hi ${user.name || "there"},`,
    "",
    "We received a request to reset your SnapItID password.",
    "Open the link below to choose a new password:",
    resetLink,
    "",
    "This link expires in 1 hour. If you did not request a reset, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>Hi ${escapeHtml(user.name || "there")},</p>
      <p>We received a request to reset your SnapItID password.</p>
      <p>
        <a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;">
          Reset password
        </a>
      </p>
      <p>If the button does not open, copy this link into your browser:</p>
      <p><a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    </div>
  `.trim();

  const payload: Record<string, unknown> = {
    from: env.RESET_EMAIL_FROM,
    to: [user.email],
    subject: "Reset your SnapItID password",
    text,
    html,
  };

  if (env.RESET_EMAIL_REPLY_TO) {
    payload.reply_to = env.RESET_EMAIL_REPLY_TO;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Password reset email failed to send (${response.status})${details ? `: ${details}` : ""}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ========== JWT & Password Hashing ==========

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64urlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function hmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  );
}

async function generateJWT(user: UserRecord, secret: string): Promise<string> {
  const header = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlEncode(JSON.stringify({
    id: user.id,
    email: user.email,
    tier: user.tier,
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
  }));
  const signingInput = `${header}.${payload}`;
  const key = await hmacKey(secret, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

async function verifyJWT(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const signingInput = `${parts[0]}.${parts[1]}`;
    const sigBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const key = await hmacKey(secret, ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC", key, sigBytes, new TextEncoder().encode(signingInput)
    );
    if (!valid) return null;
    const payload = JSON.parse(
      decodeURIComponent(escape(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))))
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

// ========== Auth Handlers ==========

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string }
    | null;

  const email = normalizeEmail(body?.email || "");
  const password = (body?.password || "").trim();
  const name = (body?.name || "").trim() || "SnapItID User";

  if (!email || !isValidEmail(email)) {
    return json({ error: "Valid email is required" }, 400);
  }

  if (!password || password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await getUserByEmail(env, email);
  if (existing) {
    return json({ error: "Email already registered" }, 409);
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  const user: UserRecord = {
    id: makeId("usr"),
    email,
    name,
    tier: "free",
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  await saveUser(env, user);

  const secret = env.JWT_SECRET || "default_secret_change_in_production";
  const token = await generateJWT(user, secret);

  return json(
    {
      success: true,
      result: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        token,
      },
    },
    201
  );
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = normalizeEmail(body?.email || "");
  const password = (body?.password || "").trim();

  if (!email || !password) {
    return json({ error: "Email and password are required" }, 400);
  }

  const user = await getUserByEmail(env, email);
  if (!user || !user.passwordHash) {
    return json({ error: "Invalid email or password" }, 401);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return json({ error: "Invalid email or password" }, 401);
  }

  const secret = env.JWT_SECRET || "default_secret_change_in_production";
  const token = await generateJWT(user, secret);

  return json({
    success: true,
    result: {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      token,
    },
  });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const token = extractToken(request);
  if (!token) {
    return json({ error: "Unauthorized" }, 401);
  }

  const secret = env.JWT_SECRET || "default_secret_change_in_production";
  const payload = await verifyJWT(token, secret);
  if (!payload) {
    return json({ error: "Invalid token" }, 401);
  }

  const user = await getUserById(env, payload.id);
  if (!user) {
    return json({ error: "User not found" }, 404);
  }

  return json({
    success: true,
    result: {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
    },
  });
}

async function getAuthenticatedUser(request: Request, env: Env): Promise<UserRecord | null> {
  const token = extractToken(request);
  if (!token) return null;

  const secret = env.JWT_SECRET || "default_secret_change_in_production";
  const payload = await verifyJWT(token, secret);
  if (!payload?.id) return null;

  return await getUserById(env, payload.id);
}

  async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
    const body = (await request.json().catch(() => null)) as
      | { email?: string }
      | null;

    const email = normalizeEmail(body?.email || "");
    if (!email || !isValidEmail(email)) {
      return json({ error: "Valid email is required" }, 400);
    }

    const user = await getUserByEmail(env, email);
    if (!user) {
      return json({
        success: true,
        result: {
          message: "If an account exists for that email, a password reset email has been sent.",
        },
      });
    }

    // Generate a reset token (valid for 1 hour)
    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await env.SNAPITID_KV.put(`reset_token:${resetToken}`, JSON.stringify({ userId: user.id, expiresAt }), { expirationTtl: 3600 });

    const resetLink = buildResetLink(env, resetToken);

    try {
      await sendPasswordResetEmail(env, user, resetLink);
    } catch (err) {
      await env.SNAPITID_KV.delete(`reset_token:${resetToken}`);
      return json(
        { error: err instanceof Error ? err.message : "Password reset email failed to send" },
        503
      );
    }

    return json({
      success: true,
      result: {
        message: "If an account exists for that email, a password reset email has been sent.",
      },
    });
  }

  async function handleResetPassword(request: Request, env: Env): Promise<Response> {
    const body = (await request.json().catch(() => null)) as
      | { token?: string; password?: string }
      | null;

    const token = (body?.token || "").trim();
    const password = (body?.password || "").trim();

    if (!token || !password) {
      return json({ error: "Token and password are required" }, 400);
    }

    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    // Verify the reset token
    const resetData = await env.SNAPITID_KV.get(`reset_token:${token}`);
    if (!resetData) {
      return json({ error: "Reset token is invalid or expired" }, 400);
    }

    const { userId, expiresAt } = JSON.parse(resetData) as { userId: string; expiresAt: string };
    if (new Date(expiresAt) < new Date()) {
      await env.SNAPITID_KV.delete(`reset_token:${token}`);
      return json({ error: "Reset token is expired" }, 400);
    }

    // Update user password
    const user = await getUserById(env, userId);
    if (!user) {
      return json({ error: "User not found" }, 404);
    }

    const passwordHash = await hashPassword(password);
    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    await saveUser(env, user);

    // Delete the used reset token
    await env.SNAPITID_KV.delete(`reset_token:${token}`);

    // Generate a new JWT token for auto-login after password reset
    const secret = env.JWT_SECRET || "default_secret_change_in_production";
    const jwtToken = await generateJWT(user, secret);

    return json({
      success: true,
      result: {
        message: "Password reset successful",
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        token: jwtToken,
      },
    });
  }

async function handleGuest(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { userId?: string }
    | null;

  const userId = (body?.userId || "").trim();
  if (userId) {
    const existing = await getUserById(env, userId);
    if (existing) {
      return json({ success: true, result: existing }, 200);
    }
  }

  const now = new Date().toISOString();
  const id = makeId("usr");
  const user: UserRecord = {
    id,
    email: `guest+${id}@snapitid.local`,
    name: "Guest User",
    tier: "free",
    createdAt: now,
    updatedAt: now,
  };

  await saveUser(env, user);
  return json({ success: true, result: user }, 201);
}

async function handleUserLookup(url: URL, env: Env): Promise<Response> {
  const userId = (url.searchParams.get("userId") || "").trim();
  const email = normalizeEmail(url.searchParams.get("email") || "");

  let user: UserRecord | null = null;
  if (userId) {
    user = await getUserById(env, userId);
  } else if (email) {
    user = await getUserByEmail(env, email);
  } else {
    return json({ error: "userId or email is required" }, 400);
  }

  if (!user) {
    return json({ error: "User not found" }, 404);
  }

  return json({ success: true, result: user }, 200);
}

async function handleCheckout(request: Request, url: URL, env: Env): Promise<Response> {
  const provider = parseProvider(url.searchParams.get("provider"));
  const plan = parsePlan(url.searchParams.get("plan"));
  const country = (url.searchParams.get("country") || "US").toUpperCase();
  const docType = (url.searchParams.get("docType") || "PASSPORT").toUpperCase();
  const successUrl = url.searchParams.get("success_url") || "";
  const cancelUrl = url.searchParams.get("cancel_url") || "";
  const userId = (url.searchParams.get("user_id") || "").trim();

  if (!provider || !plan) {
    return json({ error: "provider and plan are required" }, 400);
  }

  let checkedUserId: string | null = null;
  if (plan === "pro" || plan === "lifetime") {
    const authenticatedUser = await getAuthenticatedUser(request, env);
    if (!authenticatedUser) {
      return json({ error: "Please log in before upgrading to Pro or Lifetime." }, 401);
    }

    if (userId && userId !== authenticatedUser.id) {
      return json({ error: "Authenticated user does not match requested checkout user." }, 403);
    }

    if (authenticatedUser.tier === plan) {
      return json({ error: `Your account is already on the ${plan} plan.` }, 409);
    }

    if (authenticatedUser.tier === "lifetime") {
      return json({ error: "Your account already has Lifetime access." }, 409);
    }

    checkedUserId = authenticatedUser.id;
  } else if (userId) {
    const user = await getUserById(env, userId);
    checkedUserId = user ? user.id : null;
  }

  const now = new Date().toISOString();
  const sessionId = makeId("pay");

  // Inject our session id into the success_url and as Stripe client_reference_id
  // so we can correlate the webhook event back to this KV record.
  const enrichedSuccessUrl = appendQueryParam(
    successUrl || `https://snapitid.ai/?billing=success&plan=${plan}`,
    "pay_id",
    sessionId
  );

  const checkoutUrl = await buildCheckoutUrl(
    provider,
    plan,
    enrichedSuccessUrl,
    cancelUrl,
    country,
    docType,
    sessionId,
    checkedUserId,
    env
  );

  if (!checkoutUrl) {
    return json(
      {
        error: `Payment provider '${provider}' is not configured for plan '${plan}'.`,
      },
      501
    );
  }

  const planInfo = PLAN_TABLE[plan];

  const session: PaymentSession = {
    id: sessionId,
    provider,
    plan,
    amount: planInfo.amount,
    currency: planInfo.currency,
    country,
    docType,
    userId: checkedUserId,
    status: "pending",
    checkoutUrl,
    createdAt: now,
    updatedAt: now,
  };

  await env.SNAPITID_KV.put(sessionKey(sessionId), JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 30,
  });

  const redirectToProvider = url.searchParams.get("redirect") !== "0";
  if (redirectToProvider) {
    return Response.redirect(checkoutUrl, 302);
  }

  return json({ success: true, result: session }, 200);
}

function appendQueryParam(rawUrl: string, key: string, value: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set(key, value);
    return u.toString();
  } catch (_err) {
    const sep = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

async function handleStatus(url: URL, env: Env): Promise<Response> {
  const id = url.searchParams.get("id") || "";
  if (!id) return json({ error: "id is required" }, 400);

  const raw = await env.SNAPITID_KV.get(sessionKey(id));
  if (!raw) return json({ error: "Payment session not found" }, 404);

  return json({ success: true, result: JSON.parse(raw) }, 200);
}

async function handleConfirm(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get("X-Confirm-Secret") || "";
  if (env.PAYMENT_CONFIRM_SECRET && secret !== env.PAYMENT_CONFIRM_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: string; status?: PaymentStatus }
    | null;

  const id = body?.id || "";
  const status = body?.status || "paid";

  if (!id) return json({ error: "id is required" }, 400);
  if (!["pending", "paid", "failed", "cancelled"].includes(status)) {
    return json({ error: "invalid status" }, 400);
  }

  const session = await markSessionStatus(env, id, status);
  if (!session) return json({ error: "Payment session not found" }, 404);

  return json({ success: true, result: session }, 200);
}

async function handleIOSActivate(request: Request, env: Env): Promise<Response> {
  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = (await request.json().catch(() => null)) as
    | { plan?: string; transactionId?: string; originalTransactionId?: string }
    | null;

  const planRaw = (body?.plan || "").toLowerCase();
  const transactionId = (body?.transactionId || "").trim();
  const originalTransactionId = (body?.originalTransactionId || "").trim();

  if (planRaw !== "pro" && planRaw !== "lifetime") {
    return json({ error: "plan must be 'pro' or 'lifetime'" }, 400);
  }
  if (!transactionId) {
    return json({ error: "transactionId is required" }, 400);
  }

  const plan = planRaw as "pro" | "lifetime";
  const existing = await env.SNAPITID_KV.get(appleActivationKey(transactionId));
  if (existing) {
    const record = JSON.parse(existing) as AppleActivationRecord;
    if (record.userId !== authenticatedUser.id) {
      return json({ error: "This Apple transaction is already linked to another account." }, 409);
    }

    const currentUser = (await getUserById(env, authenticatedUser.id)) || authenticatedUser;
    const secret = env.JWT_SECRET || "default_secret_change_in_production";
    const token = await generateJWT(currentUser, secret);
    return json({
      success: true,
      result: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        tier: currentUser.tier,
        token,
      },
    }, 200);
  }

  // NOTE: Transaction validation is enforced on-device via StoreKit 2.
  // Production-hardening should also verify signed transactions server-side.
  const user = (await getUserById(env, authenticatedUser.id)) || authenticatedUser;
  const now = new Date().toISOString();
  if (!(user.tier === "lifetime" && plan === "pro")) {
    user.tier = plan;
  }
  user.updatedAt = now;
  user.lastPaymentAt = now;
  user.lastPaymentSessionId = `apple_${transactionId}`;
  await saveUser(env, user);

  const activation: AppleActivationRecord = {
    transactionId,
    originalTransactionId: originalTransactionId || undefined,
    userId: user.id,
    plan,
    activatedAt: now,
  };
  await env.SNAPITID_KV.put(appleActivationKey(transactionId), JSON.stringify(activation), {
    expirationTtl: 60 * 60 * 24 * 365 * 5,
  });

  const secret = env.JWT_SECRET || "default_secret_change_in_production";
  const token = await generateJWT(user, secret);
  return json(
    {
      success: true,
      result: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        token,
      },
    },
    200
  );
}

async function buildCheckoutUrl(
  provider: PaymentProvider,
  plan: BillingPlan,
  successUrl: string,
  cancelUrl: string,
  country: string,
  docType: string,
  sessionId: string,
  userId: string | null,
  env: Env
): Promise<string | null> {
  if (provider === "stripe") {
    const dynamic = await createStripeCheckout(
      plan,
      successUrl,
      cancelUrl,
      country,
      docType,
      sessionId,
      userId,
      env
    );
    if (dynamic) return dynamic;
    const hosted = getHostedStripeLink(plan, env);
    if (!hosted) return null;
    // Attach client_reference_id so the Stripe webhook can map back to our KV session.
    return appendQueryParam(hosted, "client_reference_id", sessionId);
  }

  if (provider === "paypal") {
    const dynamic = await createPayPalOrder(
      plan,
      successUrl,
      cancelUrl,
      country,
      docType,
      env
    );
    if (dynamic) return dynamic;
    return getHostedPayPalLink(plan, env);
  }

  if (provider === "wechat") {
    return getHostedWechatLink(plan, env);
  }

  return null;
}

function getHostedStripeLink(plan: BillingPlan, env: Env): string | null {
  if (plan === "single") return env.STRIPE_PAYMENT_LINK_SINGLE || null;
  if (plan === "pro") return env.STRIPE_PAYMENT_LINK_PRO || null;
  return env.STRIPE_PAYMENT_LINK_LIFETIME || null;
}

function getHostedPayPalLink(plan: BillingPlan, env: Env): string | null {
  if (plan === "single") return env.PAYPAL_PAYMENT_LINK_SINGLE || null;
  if (plan === "pro") return env.PAYPAL_PAYMENT_LINK_PRO || null;
  return env.PAYPAL_PAYMENT_LINK_LIFETIME || null;
}

function getHostedWechatLink(plan: BillingPlan, env: Env): string | null {
  if (plan === "single") return env.WECHAT_PAY_URL_SINGLE || null;
  if (plan === "pro") return env.WECHAT_PAY_URL_PRO || null;
  return env.WECHAT_PAY_URL_LIFETIME || null;
}

async function createStripeCheckout(
  plan: BillingPlan,
  successUrl: string,
  cancelUrl: string,
  country: string,
  docType: string,
  sessionId: string,
  userId: string | null,
  env: Env
): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY) return null;

  const priceId =
    plan === "single"
      ? env.STRIPE_PRICE_ID_SINGLE
      : plan === "pro"
      ? env.STRIPE_PRICE_ID_PRO
      : env.STRIPE_PRICE_ID_LIFETIME;

  if (!priceId) return null;

  const form = new URLSearchParams();
  form.set("mode", plan === "single" ? "payment" : "subscription");
  form.set("success_url", successUrl || "https://snapitid.ai/?billing=success");
  form.set("cancel_url", cancelUrl || "https://snapitid.ai/?billing=cancel");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("client_reference_id", sessionId);
  form.set("metadata[snapitid_session_id]", sessionId);
  form.set("metadata[country]", country);
  form.set("metadata[docType]", docType);
  form.set("metadata[plan]", plan);
  if (userId) {
    form.set("metadata[snapitid_user_id]", userId);
  }

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!resp.ok) {
    return null;
  }

  const data = (await resp.json().catch(() => null)) as
    | { url?: string }
    | null;

  return data?.url || null;
}

async function createPayPalOrder(
  plan: BillingPlan,
  successUrl: string,
  cancelUrl: string,
  country: string,
  docType: string,
  env: Env
): Promise<string | null> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return null;

  const apiBase = env.PAYPAL_API_BASE || "https://api-m.paypal.com";

  const token = await getPayPalToken(apiBase, env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
  if (!token) return null;

  const planInfo = PLAN_TABLE[plan];
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: planInfo.currency,
          value: planInfo.amount.toFixed(2),
        },
        custom_id: `${plan}:${country}:${docType}`,
        description: `SnapItID ${planInfo.label}`,
      },
    ],
    application_context: {
      return_url: successUrl || "https://snapitid.ai/?billing=success",
      cancel_url: cancelUrl || "https://snapitid.ai/?billing=cancel",
      brand_name: "SnapItID",
      user_action: "PAY_NOW",
    },
  };

  const resp = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) return null;

  const data = (await resp.json().catch(() => null)) as
    | { links?: Array<{ rel?: string; href?: string }> }
    | null;

  const approve = data?.links?.find((l) => l.rel === "approve")?.href;
  return approve || null;
}

async function getPayPalToken(
  apiBase: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) return null;

  const data = (await resp.json().catch(() => null)) as
    | { access_token?: string }
    | null;

  return data?.access_token || null;
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      501
    );
  }

  const signature = request.headers.get("stripe-signature") || "";
  const body = await request.text();

  const event = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);

  if (!event) {
    return json({ error: "Webhook signature verification failed" }, 403);
  }

  if (event.type === "checkout.session.completed") {
    const stripeSession = event.data.object as any;
    const sessionId = extractSessionId(stripeSession);
    if (sessionId) {
      await markSessionStatus(env, sessionId, "paid");
    }
  }

  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const stripeSession = event.data.object as any;
    const sessionId = extractSessionId(stripeSession);
    if (sessionId) {
      await markSessionStatus(
        env,
        sessionId,
        event.type === "checkout.session.expired" ? "cancelled" : "failed"
      );
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as any;
    const sessionId =
      (charge.metadata && charge.metadata.snapitid_session_id) || null;
    if (sessionId) {
      await markSessionStatus(env, sessionId, "cancelled");
    }
  }

  return json({ success: true, received: true }, 200);
}

function extractSessionId(stripeSession: any): string | null {
  if (!stripeSession) return null;
  if (typeof stripeSession.client_reference_id === "string" && stripeSession.client_reference_id) {
    return stripeSession.client_reference_id;
  }
  if (
    stripeSession.metadata &&
    typeof stripeSession.metadata.snapitid_session_id === "string" &&
    stripeSession.metadata.snapitid_session_id
  ) {
    return stripeSession.metadata.snapitid_session_id;
  }
  return null;
}

async function markSessionStatus(
  env: Env,
  sessionId: string,
  status: PaymentStatus
): Promise<PaymentSession | null> {
  const raw = await env.SNAPITID_KV.get(sessionKey(sessionId));
  if (!raw) return null;
  const session = JSON.parse(raw) as PaymentSession;
  session.status = status;
  session.updatedAt = new Date().toISOString();
  await env.SNAPITID_KV.put(sessionKey(sessionId), JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 30,
  });

  if (status === "paid") {
    await applyEntitlementFromSession(env, session);
  }

  return session;
}

async function applyEntitlementFromSession(env: Env, session: PaymentSession): Promise<void> {
  if (!session.userId) return;
  if (session.plan !== "pro" && session.plan !== "lifetime") return;

  const user = await getUserById(env, session.userId);
  if (!user) return;

  const now = new Date().toISOString();
  user.tier = session.plan;
  user.updatedAt = now;
  user.lastPaymentAt = now;
  user.lastPaymentSessionId = session.id;
  await saveUser(env, user);
}

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<{ type: string; data: { object: any } } | null> {
  try {
    const [t, v1] = signature.split(",").map((s) => s.split("=")[1]);

    // Use the crypto API to compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const msgBuffer = encoder.encode(`${t}.${body}`);
    const signature_computed = await crypto.subtle.sign("HMAC", key, msgBuffer);
    const v1_computed = Array.from(new Uint8Array(signature_computed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(v1, v1_computed)) {
      return null;
    }

    return JSON.parse(body);
  } catch (_err) {
    return null;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
