// framing.js
// Pure passport/visa framing math: unit conversion, per-country profiles, and
// the compliance transform that maps a detected face on a source image to a
// correctly-sized output canvas. No DOM access, no state — safe to unit-test.

export const DPI = 300;
export const MM_PER_INCH = 25.4;

export function mmToPx(mm) {
  return Math.round((mm / MM_PER_INCH) * DPI);
}

export const DEFAULT_FRAMING_PROFILE = {
  targetHeadRatio: 0.56,
  minHeadRatio: 0.52,
  maxHeadRatio: 0.64,
  topSpaceRatio: 0.1,
  minTopSpaceRatio: 0.07,
  maxTopSpaceRatio: 0.14,
  sideSpaceRatio: 0.07,
  bottomSpaceRatio: 0.1,
  maxCenterOffsetRatio: 0.035,
};

export const COUNTRY_FRAMING_PROFILES = {
  AU: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  CA: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  CN: { passport: { targetHeadRatio: 0.6, minHeadRatio: 0.56, maxHeadRatio: 0.66, topSpaceRatio: 0.09, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  DE: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  ES: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  FR: { passport: { targetHeadRatio: 0.55, topSpaceRatio: 0.11, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.11, sideSpaceRatio: 0.07 } },
  GB: { passport: { targetHeadRatio: 0.55, topSpaceRatio: 0.11, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.11, sideSpaceRatio: 0.07 } },
  ID: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  IN: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  IT: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  JP: { passport: { targetHeadRatio: 0.57, topSpaceRatio: 0.09, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.55, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  MY: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  NL: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  PH: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  PL: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  SE: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  SG: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  TH: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
  US: { passport: { targetHeadRatio: 0.56, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 }, visa: { targetHeadRatio: 0.54, topSpaceRatio: 0.1, sideSpaceRatio: 0.07 } },
  VN: { passport: { targetHeadRatio: 0.58, minHeadRatio: 0.54, maxHeadRatio: 0.64, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 }, visa: { targetHeadRatio: 0.56, minHeadRatio: 0.52, maxHeadRatio: 0.62, topSpaceRatio: 0.1, sideSpaceRatio: 0.08 } },
};

function getStandardProfileForSize(size) {
  if (!size || !size.width || !size.height) return null;

  // 35x45mm standard: chin-to-crown 32-36mm, crown top spacing around 3-5mm.
  const w = Number(size.width);
  const h = Number(size.height);
  const is35x45 = Math.abs(w - 35) <= 0.6 && Math.abs(h - 45) <= 0.6;
  if (!is35x45) return null;

  return {
    targetHeadRatio: 34 / 45,
    minHeadRatio: 32 / 45,
    maxHeadRatio: 36 / 45,
    topSpaceRatio: 4 / 45,
    minTopSpaceRatio: 3 / 45,
    maxTopSpaceRatio: 5 / 45,
  };
}

// Merge the default profile with a country/document override and any
// rule-derived head ratio (when the country specifies an absolute head height
// in mm rather than a ratio).
export function getFramingProfile(countryCode, documentType, size) {
  const docKey = String(documentType || "PASSPORT").toUpperCase() === "VISA" ? "visa" : "passport";
  const cc = String(countryCode || "").toUpperCase();
  const countryProfile = COUNTRY_FRAMING_PROFILES[cc] || null;
  const override = countryProfile ? (countryProfile[docKey] || countryProfile.passport || null) : null;

  const ruleHeadRatio = size && typeof size.headHeight === "number" && size.height
    ? Math.max(0.5, Math.min(0.72, size.headHeight / mmToPx(size.height)))
    : null;

  const merged = {
    ...DEFAULT_FRAMING_PROFILE,
    ...(override || {}),
  };

  const standardProfile = getStandardProfileForSize(size);
  if (standardProfile) {
    // Enforce strict 35x45 compliance envelope regardless of legacy country
    // table values that may use an older, smaller head-size interpretation.
    merged.targetHeadRatio = standardProfile.targetHeadRatio;
    merged.minHeadRatio = standardProfile.minHeadRatio;
    merged.maxHeadRatio = standardProfile.maxHeadRatio;
    merged.topSpaceRatio = standardProfile.topSpaceRatio;
    merged.minTopSpaceRatio = standardProfile.minTopSpaceRatio;
    merged.maxTopSpaceRatio = standardProfile.maxTopSpaceRatio;
    return merged;
  }

  if (!override || typeof override.targetHeadRatio !== "number") {
    merged.targetHeadRatio = ruleHeadRatio || merged.targetHeadRatio;
  }
  if (!override || typeof override.minHeadRatio !== "number") {
    merged.minHeadRatio = Math.max(0.5, merged.targetHeadRatio - 0.04);
  }
  if (!override || typeof override.maxHeadRatio !== "number") {
    merged.maxHeadRatio = Math.min(0.72, merged.targetHeadRatio + 0.06);
  }

  return merged;
}

// Build framing metrics from a person bounding box and optional head bounding
// box. When head bounds are missing, approximate them from the top portion of
// the person bounds.
export function computeFramingMetrics(personBounds, headBounds) {
  const hb = headBounds || {
    top: personBounds.top,
    bottom: Math.min(personBounds.bottom, Math.floor(personBounds.top + personBounds.height * 0.32)),
    left: Math.floor(personBounds.left + personBounds.width * 0.29),
    right: Math.ceil(personBounds.right - personBounds.width * 0.29),
  };

  const headWidth = Math.max(1, hb.right - hb.left + 1);
  const headHeight = Math.max(1, hb.bottom - hb.top + 1);

  return {
    headTop: hb.top,
    headBottom: hb.bottom,
    headLeft: hb.left,
    headRight: hb.right,
    headWidth,
    headHeight,
    centerX: (hb.left + hb.right) / 2,
    crownY: hb.top,
  };
}

// Compute the source→output transform (scale + translation) that places the
// detected head correctly per the framing profile.
//
// options.fillOutput: when true (AI-enhanced images with a clean studio
// background), bump scale up so the output is fully covered even if that
// pushes the head slightly above the maxHeadRatio cap.
export function computeComplianceTransform(
  imageWidth, imageHeight, outW, outH,
  metrics, profile, userZoom, offsetXFrac, offsetYFrac, options
) {
  const fillOutput = !!(options && options.fillOutput);
  const sidePaddingPx = outW * profile.sideSpaceRatio;
  const minBottomPaddingPx = outH * profile.bottomSpaceRatio;
  const minTopPx = outH * profile.minTopSpaceRatio;
  const maxTopPx = outH * profile.maxTopSpaceRatio;
  const targetTopPx = outH * profile.topSpaceRatio;

  const targetHeadPx = outH * profile.targetHeadRatio;
  const minHeadPx = outH * profile.minHeadRatio;
  const maxHeadPx = outH * profile.maxHeadRatio;

  const baseScale = targetHeadPx / Math.max(1, metrics.headHeight);
  const maxScaleByHeadRatio = maxHeadPx / Math.max(1, metrics.headHeight);
  const minScaleByHeadRatio = minHeadPx / Math.max(1, metrics.headHeight);
  const maxScaleByHeadWidth = (outW - sidePaddingPx * 2) / Math.max(1, metrics.headWidth);
  const zoomedScale = baseScale * userZoom;
  const cappedScale = Math.min(zoomedScale, maxScaleByHeadRatio, maxScaleByHeadWidth);
  let scale = Math.max(0.08, Math.max(minScaleByHeadRatio, cappedScale));

  // When caller requires the output to be fully covered (AI-enhanced image
  // already has a clean studio background), bump scale up so the image fills
  // the canvas. If the AI image is itself a tight portrait, coverScale may
  // exceed maxScaleByHeadRatio — we allow it, because leaving blank canvas is
  // worse than a slightly oversized head.
  if (fillOutput) {
    const coverScale = Math.max(outW / imageWidth, outH / imageHeight);
    scale = Math.min(maxScaleByHeadRatio, Math.max(scale, coverScale));
  }

  const drawW = imageWidth * scale;
  const drawH = imageHeight * scale;
  let dx = outW / 2 - metrics.centerX * scale + outW * offsetXFrac;
  let dy = targetTopPx - metrics.crownY * scale + outH * offsetYFrac;

  // Keep head within side margins.
  const headLeftOut = metrics.headLeft * scale + dx;
  if (headLeftOut < sidePaddingPx) dx += sidePaddingPx - headLeftOut;
  const headRightOut = metrics.headRight * scale + dx;
  if (headRightOut > outW - sidePaddingPx) dx -= headRightOut - (outW - sidePaddingPx);

  // Keep face center close to the horizontal centerline.
  const maxCenterOffsetPx = outW * profile.maxCenterOffsetRatio;
  const headCenterOut = ((metrics.headLeft + metrics.headRight) * 0.5) * scale + dx;
  const centerDiff = headCenterOut - outW / 2;
  if (centerDiff > maxCenterOffsetPx) dx -= centerDiff - maxCenterOffsetPx;
  else if (centerDiff < -maxCenterOffsetPx) dx += -maxCenterOffsetPx - centerDiff;

  // Keep crown within top-spacing band.
  const headTopOut = metrics.headTop * scale + dy;
  if (headTopOut < minTopPx) dy += minTopPx - headTopOut;
  else if (headTopOut > maxTopPx) dy -= headTopOut - maxTopPx;

  // Keep head bottom above the bottom safe margin.
  const headBottomOut = metrics.headBottom * scale + dy;
  const maxHeadBottom = outH - minBottomPaddingPx;
  if (headBottomOut > maxHeadBottom) dy -= headBottomOut - maxHeadBottom;

  // Final clamp: only prevent blank edges when the source image is *larger*
  // than the output. When scale < 1, compliance centering already placed it
  // correctly; clamping to an edge would shove the face off-center.
  if (drawW >= outW) {
    if (dx > 0) dx = 0;
    if (dx + drawW < outW) dx = outW - drawW;
  }
  if (drawH >= outH) {
    if (dy > 0) dy = 0;
    if (dy + drawH < outH) dy = outH - drawH;
  }

  return { dx, dy, drawW, drawH };
}
