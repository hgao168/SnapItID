// pages/examples/examples.js
Page({
  data: {
    features: [
      { icon: '🕶️', name: 'Glasses removal', desc: 'Detected and removed by GPT Image — face preserved exactly.' },
      { icon: '🧢', name: 'Head covering removal', desc: 'Required for countries like the US, UK, and Australia.' },
      { icon: '⬜', name: 'Background replacement', desc: 'Pure white (or country-required color) — no gradients, no shadows.' },
      { icon: '✂️', name: 'ICAO crop & framing', desc: 'Head occupies 70–80% of frame height; crown 5% from top edge.' },
      { icon: '🖨️', name: '300 DPI output', desc: 'Print-ready at exact passport/visa millimeter sizes.' },
    ],
  },
  goStudio() {
    wx.switchTab({ url: '/pages/studio/studio' });
  },
});
