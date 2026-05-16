/* SnapItID Photo Studio - client side */

const API_BASE = "https://api.snapitid.ai";
const DPI = 300;
const MM_PER_INCH = 25.4;

const els = {
  engineStatus: document.getElementById("engine-status"),
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
  bgColor: document.getElementById("bgColor"),
  processBtn: document.getElementById("processBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  status: document.getElementById("statusLine"),
};

const state = {
  rules: null,           // current country rules
  sourceImage: null,     // HTMLImageElement of selected source
  mask: null,            // ImageBitmap or HTMLCanvasElement of segmentation mask
  cameraStream: null,
  segmenter: null,
  segmenterReady: false,
};

const BG_PRESETS = {
  WHITE: "#ffffff",
  OFF_WHITE: "#f8f8f8",
  LIGHT_NEUTRAL: "#f0f0f0",
  LIGHT_GREY: "#e8e8e8",
};

/* ---------- helpers ---------- */
function setStatus(msg, kind) {
  els.status.textContent = msg || "";
  els.status.className = "status-line" + (kind ? " " + kind : "");
}

function setEngine(label, kind) {
  els.engineStatus.textContent = label;
  els.engineStatus.className = "pill" + (kind ? " " + kind : "");
}

function mmToPx(mm) {
  return Math.round((mm / MM_PER_INCH) * DPI);
}

async function fetchJSON(url, options) {
  const r = await fetch(url, options || {});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
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

/* ---------- rules ---------- */
async function loadRules() {
  const code = els.country.value;
  els.rulesPanel.textContent = "Loading rules…";
  try {
    const r = await fetchJSON(`${API_BASE}/api/rules/${code}`);
    state.rules = r;
    renderRules();
  } catch (err) {
    els.rulesPanel.textContent = "Could not load rules: " + err.message;
  }
}

function activeSize() {
  if (!state.rules) return null;
  return els.doc.value === "VISA" ? state.rules.visaSize : state.rules.passportSize;
}

function renderRules() {
  const r = state.rules;
  if (!r) { els.rulesPanel.textContent = ""; return; }
  const size = activeSize();
  const bg = r.backgroundColorRequirement;
  els.bgColor.value = BG_PRESETS[bg] || "#ffffff";

  els.rulesPanel.innerHTML = `
    <div><strong>${r.countryName}</strong> · ${els.doc.value === "VISA" ? "Visa" : "Passport"}</div>
    <div>Size: <strong>${size.width} × ${size.height} mm</strong> (${mmToPx(size.width)} × ${mmToPx(size.height)} px @ ${DPI} DPI)</div>
    <div>Background: <strong>${bg.replace("_", " ")}</strong></div>
    <div>Smile: <strong>${r.smileAllowed ? "allowed" : "not allowed"}</strong> · Glasses: <strong>${r.glassesAllowed ? "allowed" : "not allowed"}</strong> · Head cover: <strong>${r.headCoverageAllowed ? "allowed" : "not allowed"}</strong></div>
  `;
  resizeOutputCanvasToSpec();
}

function resizeOutputCanvasToSpec() {
  const size = activeSize();
  if (!size) return;
  els.outputCanvas.width = mmToPx(size.width);
  els.outputCanvas.height = mmToPx(size.height);
}

/* ---------- tabs ---------- */
els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    Object.values(els.panes).forEach((p) => p.classList.remove("active"));
    els.panes[tab.dataset.tab].classList.add("active");
  });
});

/* ---------- upload ---------- */
els.fileInput.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) loadFromFile(f);
});

["dragenter", "dragover"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add("dragover"); })
);
["dragleave", "drop"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove("dragover"); })
);
els.dropzone.addEventListener("drop", (e) => {
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) loadFromFile(f);
});

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
    state.sourceImage = img;
    els.originalImg.src = url;
    els.originalImg.parentElement.classList.add("has-content");
    els.processBtn.disabled = false;
    setStatus("Photo loaded. Click Process Photo.", "ok");
    // Auto-process for quick UX
    processPhoto();
  };
  img.onerror = () => setStatus("Could not load image.", "err");
  img.src = url;
}

/* ---------- camera ---------- */
els.startCam.addEventListener("click", async () => {
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    els.video.srcObject = state.cameraStream;
    els.startCam.disabled = true;
    els.capture.disabled = false;
    els.stopCam.disabled = false;
    setStatus("Camera live. Align your face and click Capture.", "ok");
  } catch (err) {
    setStatus("Camera access denied: " + err.message, "err");
  }
});

els.capture.addEventListener("click", () => {
  if (!state.cameraStream) return;
  const v = els.video;
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  loadFromDataURL(c.toDataURL("image/jpeg", 0.95));
});

els.stopCam.addEventListener("click", () => {
  if (state.cameraStream) state.cameraStream.getTracks().forEach((t) => t.stop());
  state.cameraStream = null;
  els.video.srcObject = null;
  els.startCam.disabled = false;
  els.capture.disabled = true;
  els.stopCam.disabled = true;
});

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
    if (maskCanvas) {
      bounds = maskBounds(maskCanvas, 128);
    }
    if (!bounds) {
      bounds = { top: 0, bottom: work.height - 1, left: 0, right: work.width - 1, width: work.width, height: work.height };
    }

    // Heuristic: head height ~ 32% of person bounding box height (top portion)
    const estHeadHeight = bounds.height * 0.32;
    // Passport spec: head occupies ~62% of photo height (between 50-69% typical)
    const desiredHeadFraction = 0.62;
    const baseScale = (outH * desiredHeadFraction) / estHeadHeight;
    const userZoom = parseFloat(els.zoom.value);
    const scale = baseScale * userZoom;

    // Source point (in work coords) that will map to a fixed point in output
    // We want: crown (bounds.top) → output Y = outH * 0.10 (plus user offset)
    const offsetYFrac = parseFloat(els.offsetY.value);
    const crownTargetY = outH * (0.10 + offsetYFrac);
    const personCenterX = (bounds.left + bounds.right) / 2;

    // Where to draw the work canvas on the output canvas
    const drawW = work.width * scale;
    const drawH = work.height * scale;
    const drawX = outW / 2 - personCenterX * scale;
    const drawY = crownTargetY - bounds.top * scale;

    // 1. Fill background
    outCtx.fillStyle = els.bgColor.value;
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
      outCtx.drawImage(personCanvas, drawX, drawY, drawW, drawH);
    } else {
      // No segmentation: just draw cropped/scaled source over background (won't replace bg)
      outCtx.drawImage(work, drawX, drawY, drawW, drawH);
    }

    els.outputCanvas.parentElement.classList.add("has-content");
    const size = activeSize();
    els.outputMeta.textContent =
      `${outW} × ${outH} px · ${size.width} × ${size.height} mm @ ${DPI} DPI · background ${els.bgColor.value}` +
      (maskCanvas ? " · background replaced" : " · background not replaced (AI unavailable)");

    els.downloadBtn.disabled = false;
    setStatus(maskCanvas ? "Done. You can adjust zoom or download." : "Done (no background removal — model unavailable).", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Processing failed: " + err.message, "err");
  } finally {
    els.processBtn.disabled = false;
  }
}

els.processBtn.addEventListener("click", processPhoto);

[els.zoom, els.offsetY, els.bgColor].forEach((c) =>
  c.addEventListener("input", () => {
    if (state.sourceImage) processPhoto();
  })
);

els.country.addEventListener("change", () => {
  loadRules().then(() => { if (state.sourceImage) processPhoto(); });
});
els.doc.addEventListener("change", () => {
  renderRules();
  if (state.sourceImage) processPhoto();
});

els.downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  const code = els.country.value.toLowerCase();
  const doc = els.doc.value.toLowerCase();
  link.download = `snapitid-${code}-${doc}.jpg`;
  link.href = els.outputCanvas.toDataURL("image/jpeg", 0.95);
  link.click();
});

/* ---------- bootstrap ---------- */
(async function init() {
  resizeOutputCanvasToSpec();
  await loadRules();
  await initSegmenter();
})();
