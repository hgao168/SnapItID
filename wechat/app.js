// app.js — SnapItID WeChat Mini App

const API_BASE = 'https://api.snapitid.ai';

// Local fallback rules (mirrors web app)
const LOCAL_RULES = {
  US: { id:'us_rules', countryCode:'US', countryName:'United States', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  CA: { id:'ca_rules', countryCode:'CA', countryName:'Canada', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  GB: { id:'gb_rules', countryCode:'GB', countryName:'United Kingdom', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'LIGHT_NEUTRAL', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  DE: { id:'de_rules', countryCode:'DE', countryName:'Germany', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  FR: { id:'fr_rules', countryCode:'FR', countryName:'France', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:true, headCoverageAllowed:false },
  JP: { id:'jp_rules', countryCode:'JP', countryName:'Japan', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  AU: { id:'au_rules', countryCode:'AU', countryName:'Australia', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  CN: { id:'cn_rules', countryCode:'CN', countryName:'China', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  IT: { id:'it_rules', countryCode:'IT', countryName:'Italy', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  ES: { id:'es_rules', countryCode:'ES', countryName:'Spain', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  NL: { id:'nl_rules', countryCode:'NL', countryName:'Netherlands', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  SE: { id:'se_rules', countryCode:'SE', countryName:'Sweden', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  PL: { id:'pl_rules', countryCode:'PL', countryName:'Poland', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:37,height:46,headHeight:294}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  IN: { id:'in_rules', countryCode:'IN', countryName:'India', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  SG: { id:'sg_rules', countryCode:'SG', countryName:'Singapore', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  TH: { id:'th_rules', countryCode:'TH', countryName:'Thailand', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  VN: { id:'vn_rules', countryCode:'VN', countryName:'Vietnam', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  ID: { id:'id_rules', countryCode:'ID', countryName:'Indonesia', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  PH: { id:'ph_rules', countryCode:'PH', countryName:'Philippines', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
  MY: { id:'my_rules', countryCode:'MY', countryName:'Malaysia', passportSize:{width:35,height:45,headHeight:288}, visaSize:{width:35,height:45,headHeight:288}, backgroundColorRequirement:'WHITE', smileAllowed:false, glassesAllowed:false, headCoverageAllowed:false },
};

const BG_COLORS = {
  WHITE: '#ffffff',
  OFF_WHITE: '#f8f8f8',
  LIGHT_NEUTRAL: '#f0f0f0',
  LIGHT_GREY: '#e8e8e8',
};

App({
  globalData: {
    apiBase: API_BASE,
    localRules: LOCAL_RULES,
    bgColors: BG_COLORS,
    rulesCache: {},   // countryCode -> rules
  },

  onLaunch() {
    console.log('SnapItID launched');
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
  enhance(countryCode, docType, imageBase64, rules) {
    return this._postApi('/api/compliance/enhance', { countryCode, documentType: docType, imageBase64, rules });
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
