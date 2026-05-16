// pages/studio/studio.js
const app = getApp();

const COUNTRIES = [
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'IT', label: '🇮🇹 Italy' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'NL', label: '🇳🇱 Netherlands' },
  { code: 'SE', label: '🇸🇪 Sweden' },
  { code: 'PL', label: '🇵🇱 Poland' },
  { code: 'JP', label: '🇯🇵 Japan' },
  { code: 'CN', label: '🇨🇳 China' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'SG', label: '🇸🇬 Singapore' },
  { code: 'TH', label: '🇹🇭 Thailand' },
  { code: 'VN', label: '🇻🇳 Vietnam' },
  { code: 'ID', label: '🇮🇩 Indonesia' },
  { code: 'PH', label: '🇵🇭 Philippines' },
  { code: 'MY', label: '🇲🇾 Malaysia' },
  { code: 'AU', label: '🇦🇺 Australia' },
];

const DOCS = [
  { code: 'PASSPORT', label: 'Passport' },
  { code: 'VISA',     label: 'Visa' },
];

const BG_LABELS = {
  WHITE: 'White',
  OFF_WHITE: 'Off-white',
  LIGHT_NEUTRAL: 'Light neutral / cream',
  LIGHT_GREY: 'Light grey',
};

Page({
  data: {
    // selectors
    countryLabels: COUNTRIES.map(c => c.label),
    docLabels: DOCS.map(d => d.label),
    countryIdx: 0,
    docIdx: 0,

    // rules
    rules: null,
    rulesLoading: false,
    bgLabel: '',
    currentSize: null,

    // enhance hint
    enhanceHint: '',

    // photo
    sourceImage: null,         // local temp file path
    sourceBase64: null,        // data:image/jpeg;base64,...

    // outputs
    enhancedImage: null,
    enhancedModel: '',
    complianceResult: null,

    // status
    isEnhancing: false,
    isChecking: false,
    statusMsg: '',
    statusKind: '',

    // derived
    confidenceLabel: '',
    confidenceClass: '',
    scoreColor: '',
  },

  onLoad() {
    this._loadRules();
  },

  // ---- pickers ----

  onCountryChange(e) {
    this.setData({ countryIdx: +e.detail.value });
    this._loadRules();
  },

  onDocChange(e) {
    this.setData({ docIdx: +e.detail.value });
    this._updateSizeAndHint();
  },

  // ---- photo selection ----

  onChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'front',
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        this._compressAndSet(path);
      },
    });
  },

  _compressAndSet(filePath) {
    wx.compressImage({
      src: filePath,
      quality: 85,
      success: (res) => {
        const compressed = res.tempFilePath;
        this.setData({
          sourceImage: compressed,
          enhancedImage: null,
          enhancedModel: '',
          complianceResult: null,
          statusMsg: '',
        });
        this._fileToBase64(compressed);
      },
      fail: () => {
        // Use original if compress fails
        this.setData({ sourceImage: filePath, enhancedImage: null, complianceResult: null, statusMsg: '' });
        this._fileToBase64(filePath);
      },
    });
  },

  _fileToBase64(filePath) {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        this.setData({ sourceBase64: `data:image/jpeg;base64,${res.data}` });
      },
      fail: (err) => {
        console.error('base64 read failed', err);
        this._setStatus('Failed to read photo: ' + err.errMsg, 'err');
      },
    });
  },

  // ---- rules ----

  async _loadRules() {
    const code = COUNTRIES[this.data.countryIdx].code;
    this.setData({ rulesLoading: true, rules: null });
    const rules = await app.fetchRules(code);
    if (rules) {
      const bg = BG_LABELS[rules.backgroundColorRequirement] || rules.backgroundColorRequirement;
      this.setData({ rules, rulesLoading: false, bgLabel: bg });
      this._updateSizeAndHint();
    } else {
      this.setData({ rulesLoading: false });
    }
  },

  _updateSizeAndHint() {
    const { rules, docIdx } = this.data;
    if (!rules) return;
    const docCode = DOCS[docIdx].code;
    const sz = docCode === 'VISA' ? rules.visaSize : rules.passportSize;
    const docName = docCode === 'VISA' ? 'visa' : 'passport';

    const actions = [];
    const forbidden = [];
    if (!rules.glassesAllowed) { forbidden.push('glasses'); actions.push('remove your glasses'); }
    if (!rules.headCoverageAllowed) { forbidden.push('head coverings'); actions.push('remove any head covering'); }
    actions.push('replace the background with pure white');

    let hint = '';
    if (forbidden.length) {
      hint = `${rules.countryName} forbids ${forbidden.join(' and ')} in ${docName} photos. ` +
             `Tap "AI Enhance" to automatically ${actions.join(', ')} while keeping your face identical.`;
    }
    this.setData({ currentSize: sz, enhanceHint: hint });
  },

  // ---- actions ----

  async onEnhance() {
    const { sourceBase64, rules, complianceResult } = this.data;
    if (!sourceBase64) { return wx.showToast({ title: 'Select a photo first', icon: 'none' }); }

    const code = COUNTRIES[this.data.countryIdx].code;
    const docCode = DOCS[this.data.docIdx].code;

    this.setData({ isEnhancing: true, complianceResult: null });
    this._setStatus('AI Enhance running — replacing background & removing forbidden items…');

    try {
      const result = await app.enhance(code, docCode, sourceBase64, rules);
      if (!result || !result.imageBase64) throw new Error('No image returned');

      // imageBase64 might or might not have the data: prefix
      let b64 = result.imageBase64;
      if (!b64.startsWith('data:')) b64 = 'data:image/png;base64,' + b64.replace(/^[^,]+,/, '');

      // Save base64 to temp file for display + saving
      const tmpPath = `${wx.env.USER_DATA_PATH}/enhanced_${Date.now()}.png`;
      const rawB64 = b64.replace(/^data:[^;]+;base64,/, '');
      wx.getFileSystemManager().writeFile({
        filePath: tmpPath,
        data: rawB64,
        encoding: 'base64',
        success: () => {
          this.setData({
            enhancedImage: tmpPath,
            enhancedModel: result.model || 'gpt-image-2',
            isEnhancing: false,
          });
          this._setStatus(`Enhancement complete (${result.model || 'gpt-image-2'}).`, 'ok');
        },
        fail: (err) => {
          // fallback: show base64 directly (limited size)
          this.setData({ enhancedImage: b64, enhancedModel: result.model || 'gpt-image-2', isEnhancing: false });
          this._setStatus('Enhancement complete.', 'ok');
        },
      });
    } catch (err) {
      this.setData({ isEnhancing: false });
      this._setStatus('AI Enhance failed: ' + err.message, 'err');
    }
  },

  async onCheck() {
    const { sourceBase64, enhancedImage, rules } = this.data;
    if (!sourceBase64) { return wx.showToast({ title: 'Select a photo first', icon: 'none' }); }

    const code = COUNTRIES[this.data.countryIdx].code;
    const docCode = DOCS[this.data.docIdx].code;

    // Prefer enhanced image if available; re-read it as base64
    this.setData({ isChecking: true });
    this._setStatus('Running ICAO compliance check…');

    try {
      let imageB64 = sourceBase64;
      if (enhancedImage && !enhancedImage.startsWith('data:')) {
        // read temp file
        const fs = wx.getFileSystemManager();
        const raw = fs.readFileSync(enhancedImage, 'base64');
        imageB64 = `data:image/jpeg;base64,${raw}`;
      } else if (enhancedImage && enhancedImage.startsWith('data:')) {
        imageB64 = enhancedImage;
      }

      const result = await app.checkCompliance(code, docCode, imageB64, rules);
      const confidence = this._confidenceLabel(result);
      this.setData({
        complianceResult: {
          ...result,
          processingTime: (result.processingTime || 0).toFixed ? result.processingTime.toFixed(2) : result.processingTime,
        },
        isChecking: false,
        confidenceLabel: confidence.label,
        confidenceClass: confidence.cls,
        scoreColor: result.complianceScore >= 90 ? 'score-green' : result.complianceScore >= 75 ? 'score-amber' : 'score-red',
      });
      this._setStatus('Compliance check complete.', 'ok');
    } catch (err) {
      this.setData({ isChecking: false });
      this._setStatus('Compliance check failed: ' + err.message, 'err');
    }
  },

  onSave() {
    const target = this.data.enhancedImage || this.data.sourceImage;
    if (!target) return;

    wx.saveImageToPhotosAlbum({
      filePath: target,
      success: () => wx.showToast({ title: 'Saved to album', icon: 'success' }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth')) {
          wx.showModal({
            title: 'Permission needed',
            content: 'Please allow SnapItID to access your photo album.',
            showCancel: false,
          });
        } else {
          wx.showToast({ title: 'Save failed', icon: 'error' });
        }
      },
    });
  },

  onReset() {
    this.setData({
      sourceImage: null,
      sourceBase64: null,
      enhancedImage: null,
      enhancedModel: '',
      complianceResult: null,
      statusMsg: '',
      statusKind: '',
    });
  },

  // ---- helpers ----

  _setStatus(msg, kind = '') {
    this.setData({ statusMsg: msg, statusKind: kind });
  },

  _confidenceLabel(result) {
    const hasAiIssue = (result.issues || []).some(i => i.category === 'AI_SERVICE' || i.category === 'aiService');
    if (hasAiIssue) return { label: 'LOW', cls: 'pill-err' };
    if (result.complianceScore >= 90) return { label: 'HIGH', cls: 'pill-ok' };
    if (result.complianceScore >= 75) return { label: 'MEDIUM', cls: 'pill-warn' };
    return { label: 'LOW', cls: 'pill-err' };
  },
});
