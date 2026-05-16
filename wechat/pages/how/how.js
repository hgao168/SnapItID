// pages/how/how.js
Page({
  data: {
    steps: [
      {
        num: '01', icon: '📷',
        title: 'Capture or upload',
        desc: 'Use the front camera or pick a photo from your album. Select your destination country and document type — rules load automatically from our Cloudflare Worker.',
      },
      {
        num: '02', icon: '🤖',
        title: 'AI Enhance (optional)',
        desc: 'Tap AI Enhance and GPT Image removes glasses, head coverings, and replaces the background with the required color — face kept identical. Results in under 30 seconds.',
      },
      {
        num: '03', icon: '✅',
        title: 'Compliance check & save',
        desc: 'Tap Check Compliance to run an ICAO vision check. A score, issues list, and recommendations are returned. Save your compliant photo to your album with one tap.',
      },
    ],
    feats: [
      { icon: '🌐', name: 'Cloud rule engine', desc: 'Country-specific sizes, backgrounds, and rules served from Cloudflare Workers.' },
      { icon: '🔒', name: 'Locked compliance', desc: 'Background color is fixed by the rule — no way to accidentally pick the wrong shade.' },
      { icon: '📴', name: 'Offline fallback', desc: 'Built-in local rules keep you working if the API is unreachable.' },
      { icon: '🖨️', name: 'Print-ready output', desc: 'Exact mm dimensions @ 300 DPI for passport and visa photo formats.' },
      { icon: '🛡️', name: 'ICAO checks', desc: 'AI vision validates face, eyes, expression, glare, head covering, and background.' },
      { icon: '🔐', name: 'Privacy first', desc: 'Compliance checks only happen when you tap the button — never automatic uploads.' },
    ],
  },
  goStudio() {
    wx.switchTab({ url: '/pages/studio/studio' });
  },
});
