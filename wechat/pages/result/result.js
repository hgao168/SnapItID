// pages/result/result.js
Page({
  data: {
    result: null,
    scoreColor: '',
    confidenceLabel: '',
    confidenceClass: '',
  },
  onLoad(options) {
    // Result passed via event bus (app.globalData.lastResult) or direct JSON
    const app = getApp();
    const r = app.globalData && app.globalData.lastResult;
    if (r) {
      const hasAiIssue = (r.issues || []).some(i => i.category === 'AI_SERVICE');
      const cl = hasAiIssue ? { label: 'LOW', cls: 'pill-err' }
        : r.complianceScore >= 90 ? { label: 'HIGH', cls: 'pill-ok' }
        : r.complianceScore >= 75 ? { label: 'MEDIUM', cls: 'pill-warn' }
        : { label: 'LOW', cls: 'pill-err' };
      this.setData({
        result: { ...r, processingTime: (r.processingTime || 0).toFixed ? r.processingTime.toFixed(2) : r.processingTime },
        scoreColor: r.complianceScore >= 90 ? 'score-green' : r.complianceScore >= 75 ? 'score-amber' : 'score-red',
        confidenceLabel: cl.label,
        confidenceClass: cl.cls,
      });
    }
  },
  onBack() {
    wx.navigateBack({ delta: 1 });
  },
});
