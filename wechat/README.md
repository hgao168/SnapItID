# SnapItID WeChat Mini App

AI passport & visa photo studio — full feature parity with snapitid.ai.

## Features

| Feature | Description |
|---------|-------------|
| Country rules | 13 countries (US, CA, GB, DE, FR, IT, ES, NL, SE, PL, JP, CN, AU) loaded from `api.snapitid.ai` with local fallback |
| AI Enhance | Calls `POST /api/compliance/enhance` (GPT Image) — removes glasses, head coverings, replaces background |
| Compliance check | Calls `POST /api/compliance/check` — ICAO vision score, issues list, recommendations |
| Camera / album | `wx.chooseMedia` — front camera or photo library |
| Save to album | `wx.saveImageToPhotosAlbum` |
| Country-aware hint | Green banner when glasses or head coverings are forbidden for the selected country/doc type |
| Before/After examples | Examples page loading images from snapitid.ai |
| Offline fallback | Built-in local rules used if API is unreachable |

## Project structure

```
wechat/
├── app.js              # Global app with shared fetchRules / checkCompliance / enhance
├── app.json            # Pages, tab bar, permissions
├── app.wxss            # Global styles (dark theme)
├── project.config.json # WeChat DevTools project config
├── sitemap.json
├── assets/icons/       # Tab bar icons (see Setup below)
└── pages/
    ├── studio/         # Main photo studio (country, rules, photo, enhance, check, save)
    ├── examples/       # Before / after gallery + AI Enhance feature list
    ├── how/            # How it works + features grid
    └── result/         # Full-screen compliance report (navigateTo target)
```

## Setup

### 1. WeChat DevTools
1. Open [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. **Import project** → select `C:\ADO\SnapItID\wechat`
3. Replace `YOUR_APPID_HERE` in `project.config.json` with your real AppID (or use test AppID)

### 2. Tab bar icons
WeChat requires PNG icons for the tab bar. Place 81×81 px PNGs at:
```
assets/icons/camera.png      (inactive)
assets/icons/camera-on.png   (active)
assets/icons/photo.png
assets/icons/photo-on.png
assets/icons/info.png
assets/icons/info-on.png
```
You can use any free icon set (e.g. Feather Icons exported as PNG).

### 3. Add `api.snapitid.ai` to allowed domains
In WeChat MP console → **Development** → **Development settings** → **Server domain** → add:
- `https://api.snapitid.ai` (request domain)
- `https://snapitid.ai` (downloadFile domain, for example images)

### 4. Required permissions (already in app.json)
- `scope.camera` — photo capture
- `scope.writePhotosAlbum` — save enhanced photo

## API

All requests hit `https://api.snapitid.ai` (same Cloudflare Worker as the web app):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rules/{cc}` | GET | Country compliance rules |
| `/api/compliance/check` | POST | ICAO compliance check |
| `/api/compliance/enhance` | POST | AI background/glasses/framing enhancement |

Request body for check/enhance:
```json
{
  "countryCode": "US",
  "documentType": "PASSPORT",
  "imageBase64": "data:image/jpeg;base64,...",
  "rules": { "glassesAllowed": false, "smileAllowed": false, "headCoverageAllowed": false }
}
```
