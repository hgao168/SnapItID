// app.js — SnapItID WeChat Mini App

const { LOCAL_COUNTRY_RULES, BG_PRESETS } = require('./services/rules-data.js');

const API_BASE = 'https://api.snapitid.ai';

App({
  globalData: {
    apiBase: API_BASE,
    localRules: LOCAL_COUNTRY_RULES,
    bgColors: BG_PRESETS,
    rulesCache: {},   // countryCode -> rules
  },

  onLaunch() {
    console.log('SnapItID launched');
    // Warm up identity for tier-aware features. Safe to ignore failures.
    this.ensureGuestUserId();
  },

  // ---- shared helpers -----

  async fetchRules(countryCode) {
    const cache = this.globalData.rulesCache;
    if (cache[countryCode]) return cache[countryCode];

    return new Promise((resolve) => {
      wx.request({
        url: `${API_BASE}/api/rules/${countryCode}`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.result) {
            const r = this._normalizeRules(res.data.result);
            if (r) {
              cache[countryCode] = r;
              return resolve(r);
            }
          }
          // fallback
          const fb = this.globalData.localRules[countryCode];
          if (fb) cache[countryCode] = fb;
          resolve(fb || null);
        },
        fail: () => {
          const fb = this.globalData.localRules[countryCode];
          if (fb) cache[countryCode] = fb;
          resolve(fb || null);
        },
      });
    });
  },

  // POST /api/compliance/check
  checkCompliance(countryCode, docType, imageBase64, rules) {
    return this._postApi('/api/compliance/check', { countryCode, documentType: docType, imageBase64, rules });
  },

  // POST /api/compliance/enhance
  async enhance(countryCode, docType, imageBase64, rules) {
    const userId = await this.ensureGuestUserId();
    const payload = { countryCode, documentType: docType, imageBase64, rules };
    if (userId) payload.userId = userId;
    return this._postApi('/api/compliance/enhance', payload);
  },

  async ensureGuestUserId() {
    const cachedUserId = wx.getStorageSync('snapitid_user_id') || '';

    try {
      const result = await this._postApi('/api/payments/guest', {
        userId: cachedUserId || undefined,
      });
      if (result && result.id) {
        wx.setStorageSync('snapitid_user_id', result.id);
        if (result.email) wx.setStorageSync('snapitid_user_email', result.email);
        if (result.name) wx.setStorageSync('snapitid_user_name', result.name);
        return result.id;
      }
    } catch (_err) {
      // Keep app flows available even if payments worker is temporarily unavailable.
    }

    return cachedUserId || null;
  },

  _postApi(path, body) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE}${path}`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: body,
        timeout: 60000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const result = (res.data && res.data.result) ? res.data.result : res.data;
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || 'Network error')),
      });
    });
  },

  _normalizeRules(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const r = {
      ...raw,
      countryCode: raw.countryCode || raw.country_code || null,
      countryName: raw.countryName || raw.country_name || null,
      passportSize: raw.passportSize || raw.passport_size || null,
      visaSize: raw.visaSize || raw.visa_size || null,
      backgroundColorRequirement: raw.backgroundColorRequirement || raw.background_color_requirement || 'WHITE',
      smileAllowed: typeof raw.smileAllowed === 'boolean' ? raw.smileAllowed : (raw.smile_allowed === true),
      glassesAllowed: typeof raw.glassesAllowed === 'boolean' ? raw.glassesAllowed : (raw.glasses_allowed === true),
      headCoverageAllowed: typeof raw.headCoverageAllowed === 'boolean' ? raw.headCoverageAllowed : (raw.head_coverage_allowed === true),
    };
    if (!r.countryName || !r.passportSize || !r.visaSize) return null;
    return r;
  },

  bgHex(requirement) {
    return this.globalData.bgColors[requirement] || '#ffffff';
  },
});
