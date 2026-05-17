/* SnapItID Photo Studio - client side */

import {
  DPI,
  MM_PER_INCH,
  mmToPx,
  getFramingProfile,
  computeFramingMetrics,
  computeComplianceTransform,
} from "./framing.js";
import { SUPPORTED_LANGS, UI_TEXT, STATIC_TRANSLATION_IDS, tr as trWithLang, trf as trfWithLang } from "./i18n.js";
import { LOCAL_COUNTRY_RULES } from "./rules-data.js";

const API_BASE_CANDIDATES = buildApiBaseCandidates();

const els = {
  header: document.querySelector(".site-header"),
  navToggle: document.getElementById("navToggle"),
  navLinks: document.getElementById("navLinks"),
  navAnchors: document.querySelectorAll(".nav-links a[href^='#']"),
  engineStatus: document.getElementById("engine-status"),
  lang: document.getElementById("langSelect"),
  country: document.getElementById("countrySelect"),
  doc: document.getElementById("docSelect"),
  rulesPanel: document.getElementById("rulesPanel"),
  tabs: document.querySelectorAll(".tab"),
  panes: { upload: document.getElementById("upload-pane"), camera: document.getElementById("camera-pane") },
  fileInput: document.getElementById("fileInput"),
  dropzone: document.getElementById("dropzone"),
  video: document.getElementById("videoPreview"),
  startCam: document.getElementById("startCameraBtn"),
  capture: document.getElementById("captureBtn"),
  stopCam: document.getElementById("stopCameraBtn"),
  originalImg: document.getElementById("originalPreview"),
  originalPh: document.getElementById("originalPlaceholder"),
  outputCanvas: document.getElementById("outputCanvas"),
  outputPh: document.getElementById("outputPlaceholder"),
  outputMeta: document.getElementById("outputMeta"),
  zoom: document.getElementById("zoomRange"),
  offsetY: document.getElementById("offsetY"),
  offsetX: document.getElementById("offsetX"),
  bgColor: document.getElementById("bgColor"),
  processBtn: document.getElementById("processBtn"),
  enhanceBtn: document.getElementById("enhanceBtn"),
  enhanceHint: document.getElementById("enhanceHint"),
  checkBtn: document.getElementById("checkBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  status: document.getElementById("statusLine"),
  complianceReport: document.getElementById("complianceReport"),
  endpointInfo: document.getElementById("endpointInfo"),
};

const state = {
  language: "en",
  rules: null,           // current country rules
  sourceImage: null,     // HTMLImageElement of selected source
  mask: null,            // ImageBitmap or HTMLCanvasElement of segmentation mask
  cameraStream: null,
  segmenter: null,
  segmenterReady: false,
  faceDetector: null,
  faceDetectorReady: false,
  apiBase: null,         // the API base that responded successfully
  lastProcessedDataURL: null,
  lastProcessedRawDataURL: null,
  lastOutputKind: null,  // "processed" or "enhanced"
  lastEnhancedRawDataURL: null,
};

let listenersBound = false;

// Debug helper
function debugVideoElement() {
  const v = els.video;
  console.log("=== VIDEO ELEMENT DEBUG ===");
  console.log("Element exists:", !!v);
  if (v) {
    console.log("Element id:", v.id);
    console.log("Visible:", v.offsetHeight > 0 && v.offsetWidth > 0);
    console.log("Display:", window.getComputedStyle(v).display);
    console.log("Width:", v.offsetWidth, "Height:", v.offsetHeight);
    console.log("Has autoplay:", v.autoplay);
    console.log("Has muted:", v.muted);
    console.log("Has playsinline:", v.hasAttribute("playsinline"));
    console.log("srcObject:", v.srcObject);
    console.log("readyState:", v.readyState, "(0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)");
    console.log("networkState:", v.networkState, "(0=NETWORK_EMPTY, 1=NETWORK_IDLE, 2=NETWORK_LOADING, 3=NETWORK_NO_SOURCE)");
  }
}

// Enumerate available cameras
async function listCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log("=== CAMERAS FOUND ===");
    cameras.forEach((cam, i) => {
      console.log(`Camera ${i}: ${cam.label || "(unnamed)"} - ID: ${cam.deviceId}`);
    });
    return cameras;
  } catch (err) {
    console.error("Failed to enumerate cameras:", err);
    return [];
  }
}

const BG_PRESETS = {
  WHITE: "#ffffff",
  OFF_WHITE: "#f8f8f8",
  LIGHT_NEUTRAL: "#f0f0f0",
  LIGHT_GREY: "#e8e8e8",
};

// Framing profiles and the getFramingProfile() / computeFramingMetrics() /
// computeComplianceTransform() helpers now live in ./framing.js.

// SUPPORTED_LANGS, UI_TEXT, STATIC_TRANSLATION_IDS now live in ./i18n.js.


// Thin wrappers around the pure-function translators in ./i18n.js so the
// rest of this file can keep calling tr(key) / trf(key, replacements) without
// threading the current language through every call site.
function tr(key) {
  return trWithLang(state.language, key);
}

function trf(key, replacements) {
  return trfWithLang(state.language, key, replacements);
}

function preferredLanguage() {
  const saved = localStorage.getItem("snapitid_lang");
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browser) ? browser : "en";
}

function applyLanguage(lang) {
  state.language = SUPPORTED_LANGS.includes(lang) ? lang : "en";
  localStorage.setItem("snapitid_lang", state.language);
  document.documentElement.lang = state.language;
  if (els.lang) els.lang.value = state.language;

  STATIC_TRANSLATION_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = tr(id);
  });

  const hintEl = document.getElementById("cameraHint");
  if (hintEl) hintEl.innerHTML = tr("cameraHintHtml");

  if (els.doc && els.doc.options.length >= 2) {
    els.doc.options[0].text = tr("passport");
    els.doc.options[1].text = tr("visa");
  }

  if (!state.rules && els.rulesPanel) {
    els.rulesPanel.textContent = tr("selectCountryPrompt");
  }

  updateEndpointInfo();
  renderRules();
}

function backgroundLabel(bgKey) {
  const key = String(bgKey || "WHITE").toUpperCase();
  if (key === "WHITE") return tr("bgWhite");
  if (key === "OFF_WHITE") return tr("bgOffWhite");
  if (key === "LIGHT_NEUTRAL") return tr("bgLightNeutral");
  if (key === "LIGHT_GREY") return tr("bgLightGrey");
  return key.replace(/_/g, " ");
}

// LOCAL_COUNTRY_RULES now lives in ./rules-data.js.

/* ---------- helpers ---------- */
function setStatus(msg, kind) {
  els.status.textContent = msg || "";
  els.status.className = "status-line" + (kind ? " " + kind : "");
}

function setEngine(label, kind) {
  els.engineStatus.textContent = label;
  els.engineStatus.className = "pill" + (kind ? " " + kind : "");
}

function buildApiBaseCandidates() {
  const list = [];

  // Primary API host — Cloudflare Workers routed on api.snapitid.ai/*
  list.push("https://api.snapitid.ai");

  // Same-origin (works on previews if Pages Functions proxy is set up).
  if (window.location && window.location.origin) {
    list.push(window.location.origin);
  }

  // Stable production domains as additional fallbacks.
  list.push("https://snapitid.ai");
  list.push("https://www.snapitid.ai");

  return [...new Set(list)];
}

function unwrapApiResult(payload) {
  // Worker responses are wrapped as { success, result }.
  if (payload && typeof payload === "object" && "result" in payload && payload.result) {
    return payload.result;
  }
  // Backward-compatible fallback for already-unwrapped responses.
  return payload;
}

function normalizeRules(raw) {
  if (!raw || typeof raw !== "object") return null;

  const normalized = {
    ...raw,
    countryCode: raw.countryCode || raw.country_code || null,
    countryName: raw.countryName || raw.country_name || null,
    passportSize: raw.passportSize || raw.passport_size || null,
    visaSize: raw.visaSize || raw.visa_size || null,
    backgroundColorRequirement:
      raw.backgroundColorRequirement ||
      raw.background_color_requirement ||
      raw.background ||
      "WHITE",
    smileAllowed:
      typeof raw.smileAllowed === "boolean"
        ? raw.smileAllowed
        : typeof raw.smile_allowed === "boolean"
          ? raw.smile_allowed
          : false,
    glassesAllowed:
      typeof raw.glassesAllowed === "boolean"
        ? raw.glassesAllowed
        : typeof raw.glasses_allowed === "boolean"
          ? raw.glasses_allowed
          : false,
    headCoverageAllowed:
      typeof raw.headCoverageAllowed === "boolean"
        ? raw.headCoverageAllowed
        : typeof raw.head_coverage_allowed === "boolean"
          ? raw.head_coverage_allowed
          : false,
  };

  if (!normalized.countryName || !normalized.passportSize || !normalized.visaSize) {
    return null;
  }

  return normalized;
}

async function fetchJSON(url, options) {
  const r = await fetch(url, options || {});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

function captureOutputSnapshotDataURL() {
  if (!els.outputCanvas || !els.outputCanvas.parentElement) return null;
  if (!els.outputCanvas.parentElement.classList.contains("has-content")) return null;
  try {
    return els.outputCanvas.toDataURL("image/jpeg", 0.95);
  } catch (_err) {
    return null;
  }
}

function makeImageFingerprint(dataUrl) {
  const raw = String(dataUrl || "");
  const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
  if (!base64) return "none";
  let hash = 2166136261;
  const len = base64.length;
  const step = Math.max(1, Math.floor(len / 1024));
  for (let i = 0; i < len; i += step) {
    hash ^= base64.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${len}-${(hash >>> 0).toString(16)}`;
}

/* ---------- segmentation engine ---------- */
async function initSegmenter() {
  setEngine("Loading AI model…");
  try {
    if (typeof SelfieSegmentation === "undefined") {
      throw new Error("Segmentation library failed to load");
    }
    const seg = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`,
    });
    seg.setOptions({ modelSelection: 1, selfieMode: false });
    seg.onResults((results) => {
      state._pendingMask = results.segmentationMask; // ImageBitmap-like
      if (state._resolveSeg) {
        state._resolveSeg(results);
        state._resolveSeg = null;
      }
    });
    await seg.initialize();
    state.segmenter = seg;
    state.segmenterReady = true;
    setEngine("AI ready", "ok");
  } catch (err) {
    console.error(err);
    setEngine("AI unavailable", "err");
    setStatus("Could not load background removal model. You can still download a cropped photo without background replacement.", "err");
  }
}

function runSegmentation(srcCanvas) {
  return new Promise((resolve, reject) => {
    if (!state.segmenterReady) return reject(new Error("Segmenter not ready"));
    state._resolveSeg = resolve;
    state.segmenter.send({ image: srcCanvas }).catch(reject);
  });
}

/* ---------- face detection engine (MediaPipe) ---------- */
async function initFaceDetector() {
  try {
    if (typeof FaceDetection === "undefined") {
      console.warn("MediaPipe FaceDetection library not loaded");
      return;
    }
    const fd = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${file}`,
    });
    fd.setOptions({ model: "short", minDetectionConfidence: 0.5 });
    fd.onResults((results) => {
      state._pendingFaces = results.detections || [];
      if (state._resolveFace) {
        state._resolveFace(results);
        state._resolveFace = null;
      }
    });
    await fd.initialize();
    state.faceDetector = fd;
    state.faceDetectorReady = true;
  } catch (err) {
    console.warn("MediaPipe FaceDetection unavailable:", err);
  }
}

function runFaceDetection(srcCanvas) {
  return new Promise((resolve, reject) => {
    if (!state.faceDetectorReady) return reject(new Error("Face detector not ready"));
    state._resolveFace = resolve;
    state.faceDetector.send({ image: srcCanvas }).catch(reject);
  });
}

// Returns head bounds in pixel coords of the given canvas using MediaPipe
// FaceDetection. Returns null on failure.
async function detectHeadBoundsMediaPipe(canvas) {
  if (!state.faceDetectorReady) return null;
  try {
    await runFaceDetection(canvas);
    const detections = state._pendingFaces || [];
    if (!detections.length) return null;
    // Pick the largest face (in case of multiple)
    let best = detections[0];
    let bestArea = 0;
    for (const d of detections) {
      const bb = d.boundingBox;
      if (!bb) continue;
      const area = (bb.width || 0) * (bb.height || 0);
      if (area > bestArea) {
        bestArea = area;
        best = d;
      }
    }
    const bb = best.boundingBox;
    if (!bb) return null;
    // MediaPipe returns normalized values: xCenter, yCenter, width, height in [0,1]
    const W = canvas.width, H = canvas.height;
    const fx = (bb.xCenter - bb.width / 2) * W;
    const fy = (bb.yCenter - bb.height / 2) * H;
    const fw = bb.width * W;
    const fh = bb.height * H;
    if (fw <= 0 || fh <= 0) return null;
    // Expand face box to full head (hair + chin/jaw + ears).
    const top = Math.max(0, Math.floor(fy - fh * 0.28));
    const bottom = Math.min(H - 1, Math.ceil(fy + fh * 1.06));
    const left = Math.max(0, Math.floor(fx - fw * 0.2));
    const right = Math.min(W - 1, Math.ceil(fx + fw * 1.2));
    if (right <= left || bottom <= top) return null;
    return { top, bottom, left, right, width: right - left + 1, height: bottom - top + 1 };
  } catch (err) {
    console.warn("MediaPipe face detection failed:", err);
    return null;
  }
}

/* ---------- rules ---------- */
async function loadRules() {
  const code = els.country.value;
  els.rulesPanel.textContent = tr("rulesLoading");
  let lastError = null;

  for (const base of API_BASE_CANDIDATES) {
    try {
      const payload = await fetchJSON(`${base}/api/rules/${code}`);
      const normalized = normalizeRules(unwrapApiResult(payload));
      if (!normalized) {
        throw new Error("Rules API returned an unexpected payload shape");
      }
      state.rules = normalized;
      state.apiBase = base;
      updateEndpointInfo();
      renderRules();
      return;
    } catch (err) {
      lastError = err;
    }
  }

  state.rules = LOCAL_COUNTRY_RULES[code] || null;
  state.apiBase = null;
  updateEndpointInfo(lastError);

  if (state.rules) {
    renderRules();
    const size = activeSize();
    const docLabel = els.doc.value === "VISA" ? tr("visa") : tr("passport");
    els.rulesPanel.innerHTML = `
      <div><strong>${state.rules.countryName}</strong> · ${docLabel}</div>
      <div>${tr("rulesFallbackLine")}</div>
      <div>${tr("sizeLabel")}: <strong>${size.width} × ${size.height} mm</strong> (${mmToPx(size.width)} × ${mmToPx(size.height)} px @ ${DPI} DPI)</div>
      <div>${tr("backgroundLabel")}: <strong>${backgroundLabel(state.rules.backgroundColorRequirement)}</strong></div>
    `;
    setStatus(tr("statusUsingLocalRules"), "ok");
    return;
  }

  els.rulesPanel.textContent = "Could not load rules: " + (lastError ? lastError.message : "Unknown error");
}

function updateEndpointInfo(err) {
  if (!els.endpointInfo) return;
  if (state.apiBase) {
    els.endpointInfo.textContent = trf("endpointUsingApi", { base: state.apiBase });
  } else {
    els.endpointInfo.textContent = tr("endpointUsingLocal");
  }
}

/* ---------- AI compliance check ---------- */
async function runComplianceCheck() {
  const snapshot = captureOutputSnapshotDataURL();
  const useEnhancedRaw = state.lastOutputKind === "enhanced" && !!state.lastEnhancedRawDataURL;
  const useProcessedRaw = state.lastOutputKind === "processed" && !!state.lastProcessedRawDataURL;
  const imageDataURL = useEnhancedRaw
    ? state.lastEnhancedRawDataURL
    : useProcessedRaw
      ? state.lastProcessedRawDataURL
      : (snapshot || state.lastProcessedDataURL);
  const sourceForCheck = useEnhancedRaw
    ? "enhanced-raw"
    : useProcessedRaw
      ? "processed-raw"
      : (state.lastOutputKind || "processed");
  if (!imageDataURL) {
    setStatus("Process a photo first.", "err");
    return;
  }
  if (!state.apiBase) {
    setStatus("API endpoint unavailable — cannot run AI compliance check.", "err");
    return;
  }

  els.checkBtn.disabled = true;
  setStatus("Running AI compliance check on the latest output…");
  els.complianceReport.hidden = true;
  els.complianceReport.textContent = "";

  try {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fingerprint = makeImageFingerprint(imageDataURL);

    const payload = {
      countryCode: els.country.value,
      documentType: els.doc.value,
      imageBase64: imageDataURL, // data URL; worker can parse
      requestId,
      clientFingerprint: fingerprint,
      imageSource: sourceForCheck,
      checkMode: "latest-output",
      rules: state.rules ? {
        glassesAllowed: state.rules.glassesAllowed,
        smileAllowed: state.rules.smileAllowed,
        headCoverageAllowed: state.rules.headCoverageAllowed,
      } : undefined,
    };
    const response = await fetchJSON(`${state.apiBase}/api/compliance/check?t=${Date.now()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = unwrapApiResult(response);
    renderComplianceResult(result, {
      requestId,
      fingerprint,
      imageSource: sourceForCheck,
    });
    setStatus("AI compliance check complete.", "ok");
  } catch (err) {
    console.error(err);
    setStatus("AI compliance check failed: " + err.message, "err");
  } finally {
    els.checkBtn.disabled = false;
  }
}

/* ---------- AI photo enhancement ---------- */
async function runAIEnhance() {
  if (!state.lastProcessedDataURL) {
    setStatus("Process a photo first.", "err");
    return;
  }
  if (!state.apiBase) {
    setStatus("API endpoint unavailable — cannot run AI enhancement.", "err");
    return;
  }

  els.enhanceBtn.disabled = true;
  if (els.checkBtn) els.checkBtn.disabled = true;
  // Clear any stale compliance report from a previous Check on the original photo.
  if (els.complianceReport) {
    els.complianceReport.hidden = true;
    els.complianceReport.innerHTML = "";
  }
  setStatus("Enhancing photo with AI… this can take 10–30 seconds.");

  try {
    const payload = {
      countryCode: els.country.value,
      documentType: els.doc.value,
      imageBase64: state.lastProcessedDataURL,
      rules: state.rules ? {
        glassesAllowed: state.rules.glassesAllowed,
        smileAllowed: state.rules.smileAllowed,
        headCoverageAllowed: state.rules.headCoverageAllowed,
      } : undefined,
    };
    const response = await fetchJSON(`${state.apiBase}/api/compliance/enhance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = unwrapApiResult(response);
    const dataUrl = result && result.imageBase64;
    const modelName = result && typeof result.model === "string" ? result.model : "AI model";
    if (!dataUrl) throw new Error("AI returned no image");
    state.lastEnhancedRawDataURL = dataUrl;

    // Load enhanced image into a temporary <img>, then redraw to the output canvas
    // at the correct passport/visa dimensions so download keeps proper sizing.
    const img = await loadImage(dataUrl);
    const size = activeSize();
    const outW = mmToPx(size.width);
    const outH = mmToPx(size.height);
    const canvas = els.outputCanvas;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    // Apply the same compliance framing constraints as the main processor.
    const bounds = {
      top: 0,
      bottom: img.height - 1,
      left: 0,
      right: img.width - 1,
      width: img.width,
      height: img.height,
    };
    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = img.width;
    faceCanvas.height = img.height;
    faceCanvas.getContext("2d").drawImage(img, 0, 0);
    // Prefer MediaPipe (cross-browser) → fall back to browser FaceDetector.
    let detectedHeadBounds = await detectHeadBoundsMediaPipe(faceCanvas);
    if (!detectedHeadBounds) detectedHeadBounds = await detectFaceBoundsFromCanvas(faceCanvas);

    ctx.fillStyle = activeBackgroundColor();
    ctx.fillRect(0, 0, outW, outH);

    if (detectedHeadBounds) {
      // Use detected head bounds for precise compliance framing.
      const metrics = computeFramingMetrics(bounds, detectedHeadBounds);
      const framingProfile = getFramingProfile(els.country.value, els.doc.value, size);
      const userZoom = parseFloat(els.zoom ? els.zoom.value : "1");
      const offsetXFrac = parseFloat(els.offsetX ? els.offsetX.value : "0");
      const offsetYFrac = parseFloat(els.offsetY ? els.offsetY.value : "0");
      const transform = computeComplianceTransform(
        img.width,
        img.height,
        outW,
        outH,
        metrics,
        framingProfile,
        userZoom,
        offsetXFrac,
        offsetYFrac,
        { fillOutput: true }
      );
      // Minor visual bias for AI-enhanced output: shift slightly down and right
      // to compensate for gpt-image-2 tending to render the head a touch high/left.
      const biasX = outW * 0.035;
      const biasY = outH * 0.03;
      ctx.drawImage(img, transform.dx + biasX, transform.dy + biasY, transform.drawW, transform.drawH);
    } else {
      // No FaceDetector: run MediaPipe segmentation on the enhanced image to find
      // the actual person/head position for compliance framing.
      let aiTransform = null;
      if (state.segmenterReady) {
        try {
          await runSegmentation(faceCanvas);
          const aiMaskCvs = document.createElement("canvas");
          aiMaskCvs.width = img.width;
          aiMaskCvs.height = img.height;
          aiMaskCvs.getContext("2d").drawImage(state._pendingMask, 0, 0, img.width, img.height);
          const personBounds = maskBounds(aiMaskCvs, 64);
          if (personBounds) {
            const headBounds = estimateHeadBoundsFromMask(aiMaskCvs, personBounds, 64);
            const aiMetrics = computeFramingMetrics(personBounds, headBounds);
            const framingProfile = getFramingProfile(els.country.value, els.doc.value, size);
            const userZoom = parseFloat(els.zoom ? els.zoom.value : "1");
            const offsetXFrac = parseFloat(els.offsetX ? els.offsetX.value : "0");
            const offsetYFrac = parseFloat(els.offsetY ? els.offsetY.value : "0");
            aiTransform = computeComplianceTransform(
              img.width, img.height, outW, outH, aiMetrics, framingProfile,
              userZoom, offsetXFrac, offsetYFrac, { fillOutput: true }
            );
          }
        } catch (segErr) {
          console.warn("Segmentation on AI-enhanced image failed:", segErr);
        }
      }
      if (aiTransform) {
        const biasX = outW * 0.035;
        const biasY = outH * 0.03;
        ctx.drawImage(img, aiTransform.dx + biasX, aiTransform.dy + biasY, aiTransform.drawW, aiTransform.drawH);
      } else {
        // Last resort: contain-fit centered
        const containScale = Math.min(outW / img.width, outH / img.height);
        const dw = img.width * containScale;
        const dh = img.height * containScale;
        const dx = (outW - dw) / 2;
        const dy = (outH - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }

    state.lastProcessedDataURL = canvas.toDataURL("image/jpeg", 0.95);
    state.lastOutputKind = "enhanced";
    els.outputMeta.textContent =
      `${outW} × ${outH} px · ${size.width} × ${size.height} mm @ ${DPI} DPI · enhanced by ${modelName}`;
    canvas.parentElement.classList.add("has-content");
    setStatus(`AI enhancement complete (${modelName}). Review and download.`, "ok");
  } catch (err) {
    console.error(err);
    setStatus("AI enhancement failed: " + err.message, "err");
  } finally {
    els.enhanceBtn.disabled = false;
    if (els.checkBtn) els.checkBtn.disabled = !state.apiBase;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load enhanced image"));
    img.src = src;
  });
}

function renderComplianceResult(result, meta) {
  if (!result) {
    els.complianceReport.hidden = true;
    return;
  }
  const score = typeof result.complianceScore === "number" ? result.complianceScore : null;
  const compliant = !!result.isCompliant;
  const issues = Array.isArray(result.issues) ? result.issues : [];
  const recs = Array.isArray(result.recommendations) ? result.recommendations : [];

  // Estimate pass-rate from failed checks found in issues.
  const TOTAL_CHECKS = 12;
  const issueFailMap = {
    face_missing: 1,
    multi_face: 1,
    not_forward: 1,
    eyes_closed: 1,
    expression: 1,
    glare: 1,
    head_cover: 1,
    shadows: 1,
    bg: 1,
    head_size: 1,
    sharpness: 1,
    too_small: 1,
  };
  const aiServiceIssue = issues.some((i) => i && i.category === "AI_SERVICE");
  const failedChecks = Math.min(
    TOTAL_CHECKS,
    issues.reduce((sum, i) => sum + (issueFailMap[i && i.id] || 0), 0)
  );
  const passedChecks = Math.max(0, TOTAL_CHECKS - failedChecks);
  const passRate = aiServiceIssue
    ? null
    : Math.round((passedChecks / TOTAL_CHECKS) * 100);
  const confidence = passRate === null
    ? "LOW"
    : passRate >= 90
      ? "HIGH"
      : passRate >= 75
        ? "MEDIUM"
        : "LOW";

  const issuesHtml = issues.length
    ? `<ul>${issues.map((i) => `<li><strong>${i.severity || "INFO"}</strong> · ${i.category || ""} — ${i.description || ""}</li>`).join("")}</ul>`
    : "<div>No issues detected.</div>";
  const recsHtml = recs.length
    ? `<div><strong>Recommendations:</strong><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul></div>`
    : "";

  els.complianceReport.innerHTML = `
    <div class="compliance-verdict ${compliant ? 'pass' : 'fail'}">
      <span class="compliance-thumb" aria-hidden="true">${compliant ? '\u{1F44D}' : '\u{1F44E}'}</span>
      <span class="compliance-verdict-text">${compliant ? 'PASS' : 'NEEDS WORK'}</span>
    </div>
    <div><strong>AI Compliance:</strong> ${compliant ? "PASS" : "NEEDS WORK"}${score !== null ? ` · Score ${score}/100` : ""}${passRate !== null ? ` · Checks passed ${passRate}%` : ""} · Confidence ${confidence}</div>
    <div class="muted">Checked image: ${meta && meta.imageSource ? meta.imageSource : "processed"} · Fingerprint ${meta && meta.fingerprint ? meta.fingerprint : "n/a"} · Request ${meta && meta.requestId ? meta.requestId : "n/a"}</div>
    ${issuesHtml}
    ${recsHtml}
  `;
  els.complianceReport.hidden = false;
}

function activeSize() {
  if (!state.rules) return null;
  return els.doc.value === "VISA" ? state.rules.visaSize : state.rules.passportSize;
}

function activeBackgroundColor() {
  if (!state.rules) return "#ffffff";
  const bgKey = state.rules.backgroundColorRequirement || "WHITE";
  return BG_PRESETS[bgKey] || "#ffffff";
}

function renderRules() {
  const r = state.rules;
  if (!r) { els.rulesPanel.textContent = ""; return; }
  const size = activeSize();
  const bg = r.backgroundColorRequirement || "WHITE";
  els.bgColor.value = activeBackgroundColor();
  els.bgColor.disabled = true;
  const bgLabel = backgroundLabel(bg);
  els.bgColor.title = `${tr("backgroundLabel")}: ${bgLabel}`;
  const docLabel = els.doc.value === "VISA" ? tr("visa") : tr("passport");

  els.rulesPanel.innerHTML = `
    <div><strong>${r.countryName}</strong> · ${docLabel}</div>
    <div>${tr("sizeLabel")}: <strong>${size.width} × ${size.height} mm</strong> (${mmToPx(size.width)} × ${mmToPx(size.height)} px @ ${DPI} DPI)</div>
    <div>${tr("backgroundLabel")}: <strong>${bgLabel}</strong></div>
    <div>${tr("smileLabel")}: <strong>${r.smileAllowed ? tr("allowed") : tr("notAllowed")}</strong> · ${tr("glassesLabel")}: <strong>${r.glassesAllowed ? tr("allowed") : tr("notAllowed")}</strong> · ${tr("headCoverLabel")}: <strong>${r.headCoverageAllowed ? tr("allowed") : tr("notAllowed")}</strong></div>
  `;
  if (els.enhanceHint) {
    const tips = [];
    if (r.glassesAllowed === false) tips.push(tr("tipRemoveGlasses"));
    if (r.headCoverageAllowed === false) tips.push(tr("tipRemoveHeadCover"));
    tips.push(tr("tipWhiteBg"));
    els.enhanceHint.textContent = "💡 " + trf("enhanceHint", {
      country: r.countryName,
      headPart: r.headCoverageAllowed === false ? tr("headPart") : "",
      doc: docLabel.toLowerCase(),
      tips: tips.join(", "),
    });
  }
  resizeOutputCanvasToSpec();
}

function resizeOutputCanvasToSpec() {
  const size = activeSize();
  if (!size) return;
  els.outputCanvas.width = mmToPx(size.width);
  els.outputCanvas.height = mmToPx(size.height);
}

function bind(el, event, handler) {
  if (!el) {
    console.warn(`Skipped binding '${event}' because target element is missing.`);
    return false;
  }
  el.addEventListener(event, handler);
  return true;
}

function shouldUseNativeShareForDownload() {
  const ua = navigator.userAgent || "";
  const isiOS = /iPhone|iPad|iPod/i.test(ua);
  const isMacTouch = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isiOS || isMacTouch;
}

function setMobileNavOpen(open) {
  if (!els.header || !els.navToggle) return;
  const isOpen = Boolean(open);
  els.header.classList.toggle("nav-open", isOpen);
  els.navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

/* ---------- event listeners setup ---------- */
function setupEventListeners() {
  if (listenersBound) return;

  if (els.navToggle && els.navLinks && els.header) {
    bind(els.navToggle, "click", () => {
      const openNow = !els.header.classList.contains("nav-open");
      setMobileNavOpen(openNow);
    });

    els.navAnchors.forEach((link) => {
      bind(link, "click", () => setMobileNavOpen(false));
    });

    bind(document, "click", (e) => {
      if (!els.header.classList.contains("nav-open")) return;
      if (els.header.contains(e.target)) return;
      setMobileNavOpen(false);
    });

    bind(document, "keydown", (e) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    });

    bind(window, "resize", () => {
      if (window.innerWidth > 900) setMobileNavOpen(false);
    });
  }

  if (!els.fileInput || !els.dropzone || !els.startCam || !els.capture || !els.stopCam) {
    console.error("Critical UI elements are missing. Event listeners were not attached.");
    setStatus("UI failed to initialize. Please refresh the page.", "err");
    return;
  }

  /* ---------- tabs ---------- */
  els.tabs.forEach((tab) => {
    bind(tab, "click", () => {
      els.tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(els.panes).forEach((p) => p.classList.remove("active"));
      els.panes[tab.dataset.tab].classList.add("active");
    });
  });

  /* ---------- upload ---------- */
  bind(els.fileInput, "change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFromFile(f);
  });

  // NOTE: the dropzone is a <label for="fileInput">, which natively opens
  // the file picker on click. Do NOT also call fileInput.click() here — that
  // would open the dialog twice and require selecting the file twice.
  bind(els.dropzone, "keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((ev) =>
    bind(els.dropzone, ev, (e) => { e.preventDefault(); els.dropzone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    bind(els.dropzone, ev, (e) => { e.preventDefault(); els.dropzone.classList.remove("dragover"); })
  );
  bind(els.dropzone, "drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFromFile(f);
  });

  /* ---------- camera ---------- */
  bind(els.startCam, "click", async () => {
    try {
      console.log("\n=== START CAMERA CLICKED ===");
      debugVideoElement();
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera requires HTTPS (or localhost) and browser media support");
      }
      
      // First, check if the video element is even ready
      if (!els.video) {
        throw new Error("Video element (#videoPreview) not found in DOM");
      }
      
      // List available cameras
      const cameras = await listCameras();
      if (cameras.length === 0) {
        throw new Error("No camera devices found on this system");
      }
      
      setStatus("Requesting camera access...", "");
      console.log("Requesting camera with basic constraint...");
      
      // Start with the simplest possible constraint
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { min: 320 } }, 
          audio: false 
        });
        console.log("✓ Camera stream obtained with basic constraint");
      } catch (err1) {
        console.warn("Failed with width constraint:", err1.name, err1.message);
        try {
          console.log("Retrying with truly minimal constraint (video: true)...");
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          console.log("✓ Camera stream obtained with minimal constraint");
        } catch (err2) {
          console.error("Failed with minimal constraint:", err2.name, err2.message);
          throw err2;
        }
      }
      
      if (!stream) {
        throw new Error("getUserMedia returned null/undefined stream");
      }
      
      // Get video tracks to verify
      const videoTracks = stream.getVideoTracks();
      console.log("Video tracks in stream:", videoTracks.length);
      videoTracks.forEach((track, i) => {
        console.log(`  Track ${i}: id=${track.id}, enabled=${track.enabled}, state=${track.readyState}`);
      });
      
      if (videoTracks.length === 0) {
        throw new Error("Stream has no video tracks");
      }
      
      console.log("Assigning stream to video element...");
      els.video.srcObject = stream;
      state.cameraStream = stream;
      
      // Wait a bit for the video to be ready, then play
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("Attempting to play video...");
      try {
        await els.video.play();
        console.log("✓ Video is playing");
      } catch (playErr) {
        console.warn("Video.play() warning (might still work):", playErr);
      }
      
      // Give it another moment to start rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      debugVideoElement();
      
      els.startCam.disabled = true;
      els.capture.disabled = false;
      els.stopCam.disabled = false;
      setStatus("✓ Camera live. Align your face and click Capture.", "ok");
      console.log("=== CAMERA STARTED SUCCESSFULLY ===\n");
      
    } catch (err) {
      console.error("=== CAMERA ERROR ===", err.name, err.message);
      debugVideoElement();
      
      const insecure = location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1";
      if (insecure) {
        setStatus("Camera needs HTTPS or localhost. Open this page via https://snapitid.ai or run a local server, then allow camera permission.", "err");
      } else {
        let errMsg = "Camera failed: ";
        if (err.name === "NotAllowedError") {
          errMsg = "⚠️ Camera permission denied. Please check your browser permissions and try again.";
        } else if (err.name === "NotFoundError") {
          errMsg = "⚠️ No camera found on this device.";
        } else if (err.name === "NotReadableError") {
          errMsg = "⚠️ Camera is already in use by another app. Close that app and try again.";
        } else if (err.name === "OverconstrainedError") {
          errMsg = "⚠️ Camera doesn't support the requested resolution. Retrying with lower resolution...";
        } else if (err.message.includes("Video element")) {
          errMsg = "⚠️ Video element issue: " + err.message;
        } else {
          errMsg += err.name + ": " + err.message;
        }
        setStatus(errMsg, "err");
      }
    }
  });

  bind(els.capture, "click", () => {
    if (!state.cameraStream) return;
    const v = els.video;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    loadFromDataURL(c.toDataURL("image/jpeg", 0.95));
  });

  bind(els.stopCam, "click", () => {
    if (state.cameraStream) state.cameraStream.getTracks().forEach((t) => t.stop());
    state.cameraStream = null;
    els.video.srcObject = null;
    els.startCam.disabled = false;
    els.capture.disabled = true;
    els.stopCam.disabled = true;
  });

  bind(els.processBtn, "click", processPhoto);
  bind(els.checkBtn, "click", runComplianceCheck);
  bind(els.enhanceBtn, "click", runAIEnhance);

  [els.zoom, els.offsetY, els.offsetX].forEach((c) =>
    bind(c, "input", () => {
      if (state.sourceImage) processPhoto();
    })
  );

  bind(els.country, "change", () => {
    loadRules().then(() => { if (state.sourceImage) processPhoto(); });
  });
  bind(els.doc, "change", () => {
    renderRules();
    if (state.sourceImage) processPhoto();
  });

  bind(els.bgColor, "change", () => {
    // Keep the control locked to the country requirement.
    if (state.rules) {
      els.bgColor.value = activeBackgroundColor();
    }
  });

  bind(els.downloadBtn, "click", () => {
    const code = els.country.value.toLowerCase();
    const doc = els.doc.value.toLowerCase();
    const filename = `snapitid-${code}-${doc}.jpg`;

    const exportBlobFromSnapshot = () => {
      if (!state.lastProcessedDataURL || typeof state.lastProcessedDataURL !== "string") return null;
      try {
        const parts = state.lastProcessedDataURL.split(",");
        if (parts.length < 2) return null;
        const mimeMatch = parts[0].match(/data:(.*?);base64/);
        const mime = (mimeMatch && mimeMatch[1]) || "image/jpeg";
        const binary = atob(parts[1]);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
      } catch (_err) {
        return null;
      }
    };

    const snapshotBlob = exportBlobFromSnapshot();
    if (snapshotBlob) {
      void handleDownloadBlob(snapshotBlob);
      return;
    }

    els.outputCanvas.toBlob(async (blob) => {
      if (!blob) { setStatus("Could not export image.", "err"); return; }
      await handleDownloadBlob(blob);
    }, "image/jpeg", 0.95);

    async function handleDownloadBlob(blob) {

      // iOS Safari ignores <a download> for data/blob URLs.
      // Use the Web Share API instead so the user gets a native share sheet
      // with "Save Image" / "Save to Photos" as an option.
      if (shouldUseNativeShareForDownload() && navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "SnapItID Passport Photo" });
          } catch (e) {
            if (e.name !== "AbortError") setStatus("Share failed: " + e.message, "err");
          }
          return;
        }
      }

      // Desktop / Android fallback: blob-URL anchor (works where <a download> is supported).
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  });

  bind(els.lang, "change", () => {
    applyLanguage(els.lang.value);
  });

  listenersBound = true;
}

/* ---------- bootstrap ---------- */
(async function init() {
  applyLanguage(preferredLanguage());

  if (location.protocol === "file:") {
    setStatus("You are opening this page as a local file. Use https://snapitid.ai or http://localhost to enable API + camera.", "err");
  }

  // Bind user interactions immediately so upload/camera controls work
  // even if rules/model initialization is still in progress.
  setupEventListeners();

  resizeOutputCanvasToSpec();
  await loadRules();
  await initSegmenter();
  // Initialize face detector in parallel (don't await — it's optional).
  initFaceDetector();
})();

function loadFromFile(file) {
  if (!file.type.startsWith("image/")) {
    setStatus("Please pick an image file.", "err");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => loadFromDataURL(reader.result);
  reader.readAsDataURL(file);
}

function loadFromDataURL(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    // Reset derived output state so checks cannot run on a previous image.
    state.lastProcessedDataURL = null;
    state.lastProcessedRawDataURL = null;
    state.lastOutputKind = null;
    state.lastEnhancedRawDataURL = null;
    if (els.downloadBtn) els.downloadBtn.disabled = true;
    if (els.checkBtn) els.checkBtn.disabled = true;
    if (els.enhanceBtn) els.enhanceBtn.disabled = true;
    if (els.complianceReport) {
      els.complianceReport.hidden = true;
      els.complianceReport.textContent = "";
    }

    state.sourceImage = img;
    els.originalImg.src = url;
    els.originalImg.parentElement.classList.add("has-content");
    els.processBtn.disabled = false;
    setStatus(tr("statusPhotoLoaded"), "ok");
    // Auto-process for quick UX
    processPhoto();
  };
  img.onerror = () => setStatus("Could not load image.", "err");
  img.src = url;
}

/* ---------- processing ---------- */
function imageToCanvas(img, maxDim) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (maxDim && Math.max(w, h) > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c;
}

// Compute bounding box from segmentation mask alpha
function maskBounds(maskCanvas, threshold) {
  const ctx = maskCanvas.getContext("2d");
  const { width: w, height: h } = maskCanvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let top = h, bottom = -1, left = w, right = -1;
  // MediaPipe mask is grayscale: white = person. Use red channel.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i] > threshold) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) return null;
  return { top, bottom, left, right, width: right - left + 1, height: bottom - top + 1 };
}

async function detectFaceBoundsFromCanvas(canvas) {
  if (typeof FaceDetector === "undefined") return null;
  try {
    const detector = new FaceDetector({ maxDetectedFaces: 1, fastMode: true });
    const faces = await detector.detect(canvas);
    if (!faces || !faces.length || !faces[0].boundingBox) return null;
    const bb = faces[0].boundingBox;
    if (bb.width <= 0 || bb.height <= 0) return null;

    // Expand face box to approximate full head bounds (hair + chin + ears).
    // FaceDetector typically returns from forehead to chin, so we extend a bit
    // upward for hair and slightly downward for chin/jaw.
    const top = Math.max(0, Math.floor(bb.y - bb.height * 0.26));
    const bottom = Math.min(canvas.height - 1, Math.ceil(bb.y + bb.height * 1.06));
    const left = Math.max(0, Math.floor(bb.x - bb.width * 0.2));
    const right = Math.min(canvas.width - 1, Math.ceil(bb.x + bb.width * 1.2));

    if (right <= left || bottom <= top) return null;
    return { top, bottom, left, right, width: right - left + 1, height: bottom - top + 1 };
  } catch (err) {
    console.warn("FaceDetector unavailable or failed, using fallback framing", err);
    return null;
  }
}

function estimateHeadBoundsFromMask(maskCanvas, personBounds, threshold) {
  const ctx = maskCanvas.getContext("2d");
  const { width: w, height: h } = maskCanvas;
  const data = ctx.getImageData(0, 0, w, h).data;

  // Step 1: compute per-row person width and leftmost/rightmost x within personBounds.
  const numRows = personBounds.bottom - personBounds.top + 1;
  if (numRows < 4) return null;
  const rowWidth = new Array(numRows).fill(0);
  const rowLeft = new Array(numRows).fill(w);
  const rowRight = new Array(numRows).fill(-1);
  for (let y = personBounds.top; y <= personBounds.bottom; y++) {
    const ri = y - personBounds.top;
    for (let x = personBounds.left; x <= personBounds.right; x++) {
      const i = (y * w + x) * 4;
      if (data[i] > threshold) {
        rowWidth[ri]++;
        if (x < rowLeft[ri]) rowLeft[ri] = x;
        if (x > rowRight[ri]) rowRight[ri] = x;
      }
    }
  }

  // Step 2: scan downward from the top of the person to find the head's widest
  // row. The head widens (hair → ears) then narrows (cheeks → chin). We track
  // a running max; when the current row's width drops to <85% of the running
  // max for several rows in a row, we know we've passed the head's widest
  // point. This avoids being fooled by shoulders, which are usually wider than
  // the head and would otherwise dominate a global max search.
  let headMaxWidth = 0;
  let headMaxIdx = -1;
  let belowCount = 0;
  for (let ri = 0; ri < numRows; ri++) {
    const rw = rowWidth[ri];
    if (rw <= 0) continue;
    if (rw > headMaxWidth) {
      headMaxWidth = rw;
      headMaxIdx = ri;
      belowCount = 0;
    } else if (headMaxWidth > 0 && rw < headMaxWidth * 0.85) {
      belowCount++;
      if (belowCount >= 3 && ri > headMaxIdx + 3) break;
    } else {
      belowCount = 0;
    }
  }
  if (headMaxWidth <= 0 || headMaxIdx < 0) return null;

  // Step 3: scan downward from the widest head row, looking for the neck-pinch:
  // the row where width is locally minimum, just before shoulders widen out again.
  // We track the minimum width seen; when width expands back to >1.25x that
  // minimum we've passed the neck.
  let neckIdx = -1;
  let neckWidth = headMaxWidth;
  for (let ri = headMaxIdx + 1; ri < numRows; ri++) {
    if (rowWidth[ri] < neckWidth) {
      neckWidth = rowWidth[ri];
      neckIdx = ri;
    } else if (neckIdx > 0 && rowWidth[ri] > neckWidth * 1.25) {
      // shoulders widening — stop, neckIdx is our chin/jaw line.
      break;
    }
  }

  // If we didn't find a clear narrowing (neck width is not significantly less
  // than head max width), fall back to a conservative head-height fraction.
  if (neckIdx < 0 || neckWidth >= headMaxWidth * 0.85) {
    neckIdx = Math.min(numRows - 1, Math.floor(numRows * 0.43));
  }

  const headTop = personBounds.top;
  const headBottom = personBounds.top + neckIdx;

  // Compute head left/right from rows in the head region only — this gives the
  // face/hair horizontal extent, not the shoulder span.
  let headLeft = w;
  let headRight = -1;
  for (let ri = 0; ri <= neckIdx; ri++) {
    if (rowWidth[ri] === 0) continue;
    if (rowLeft[ri] < headLeft) headLeft = rowLeft[ri];
    if (rowRight[ri] > headRight) headRight = rowRight[ri];
  }
  if (headRight <= headLeft) return null;

  return {
    top: headTop,
    bottom: headBottom,
    left: headLeft,
    right: headRight,
    width: headRight - headLeft + 1,
    height: headBottom - headTop + 1,
  };
}

// computeFramingMetrics + computeComplianceTransform now live in ./framing.js.

async function processPhoto() {
  if (!state.sourceImage) return;
  if (!state.rules) { setStatus("Select a country first.", "err"); return; }

  setStatus("Processing…");
  els.processBtn.disabled = true;
  els.downloadBtn.disabled = true;

  try {
    resizeOutputCanvasToSpec();
    const outCanvas = els.outputCanvas;
    const outCtx = outCanvas.getContext("2d");
    const outW = outCanvas.width;
    const outH = outCanvas.height;

    // Work canvas at moderate resolution for speed (up to 1024px on longest side)
    const work = imageToCanvas(state.sourceImage, 1024);
    let maskCanvas = null;

    if (state.segmenterReady) {
      try {
        await runSegmentation(work);
        // Draw mask to its own canvas at same size as work
        maskCanvas = document.createElement("canvas");
        maskCanvas.width = work.width;
        maskCanvas.height = work.height;
        maskCanvas.getContext("2d").drawImage(state._pendingMask, 0, 0, work.width, work.height);
      } catch (err) {
        console.warn("Segmentation failed, falling back to center crop", err);
      }
    }

    // Determine bounding box of person (or fall back to full image)
    let bounds;
    // Prefer MediaPipe face detection (cross-browser) → fall back to the browser
    // FaceDetector API → fall back to segmentation-mask head estimation.
    let headBounds = await detectHeadBoundsMediaPipe(work);
    if (!headBounds) headBounds = await detectFaceBoundsFromCanvas(work);
    if (maskCanvas) {
      // Use a stricter threshold (180) for person bounds so uncertain edge pixels
      // (common with complex / dark backgrounds) don't inflate the bounding box
      // and skew head-position estimation. Fall back to 128 if strict scan yields nothing.
      bounds = maskBounds(maskCanvas, 180) || maskBounds(maskCanvas, 128);
      if (!headBounds && bounds) {
        headBounds = estimateHeadBoundsFromMask(maskCanvas, bounds, 128);
      }
    }
    if (!bounds) {
      bounds = { top: 0, bottom: work.height - 1, left: 0, right: work.width - 1, width: work.width, height: work.height };
    }
    const currentSize = activeSize();
    const framingProfile = getFramingProfile(els.country.value, els.doc.value, currentSize);
    const metrics = computeFramingMetrics(bounds, headBounds);
    const userZoom = parseFloat(els.zoom.value);
    const offsetYFrac = parseFloat(els.offsetY.value);
    const offsetXFrac = parseFloat(els.offsetX ? els.offsetX.value : "0");
    const transform = computeComplianceTransform(
      work.width,
      work.height,
      outW,
      outH,
      metrics,
      framingProfile,
      userZoom,
      offsetXFrac,
      offsetYFrac
    );

    // 1. Fill background
    outCtx.fillStyle = activeBackgroundColor();
    outCtx.fillRect(0, 0, outW, outH);

    // 2. Build the person-only image (work pixels masked by segmentation)
    if (maskCanvas) {
      const personCanvas = document.createElement("canvas");
      personCanvas.width = work.width;
      personCanvas.height = work.height;
      const pCtx = personCanvas.getContext("2d");
      pCtx.drawImage(work, 0, 0);
      pCtx.globalCompositeOperation = "destination-in";
      pCtx.drawImage(maskCanvas, 0, 0);
      pCtx.globalCompositeOperation = "source-over";
      const biasX = outW * 0.035;
      const biasY = outH * 0.03;
      outCtx.drawImage(personCanvas, transform.dx + biasX, transform.dy + biasY, transform.drawW, transform.drawH);
    } else {
      // No segmentation: just draw cropped/scaled source over background (won't replace bg)
      const biasX = outW * 0.035;
      const biasY = outH * 0.03;
      outCtx.drawImage(work, transform.dx + biasX, transform.dy + biasY, transform.drawW, transform.drawH);
    }

    els.outputCanvas.parentElement.classList.add("has-content");
    const size = activeSize();
    els.outputMeta.textContent =
      `${outW} × ${outH} px · ${size.width} × ${size.height} mm @ ${DPI} DPI · background ${activeBackgroundColor()}` +
      (maskCanvas ? " · background replaced" : " · background not replaced (AI unavailable)");

    state.lastProcessedDataURL = outCanvas.toDataURL("image/jpeg", 0.95);
    state.lastProcessedRawDataURL = state.lastProcessedDataURL;
    state.lastOutputKind = "processed";
    state.lastEnhancedRawDataURL = null;
    els.downloadBtn.disabled = false;
    if (els.checkBtn) els.checkBtn.disabled = !state.apiBase;
    if (els.enhanceBtn) els.enhanceBtn.disabled = !state.apiBase;
    setStatus(maskCanvas ? "Done. Compliance framing applied for head size and spacing." : "Done (no background removal - model unavailable).", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Processing failed: " + err.message, "err");
  } finally {
    els.processBtn.disabled = false;
  }
}
