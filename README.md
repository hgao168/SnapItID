# SnapItID iOS MVP - Phase 1

## Overview
SnapItID is a global AI-powered identity photo platform with real-time compliance checking. Phase 1 MVP focuses on iOS app development with Cloudflare backend integration.

## Architecture

### Frontend (iOS - SwiftUI)
- **Photo Capture**: Native camera integration with photo library access
- **Country Selection**: Support for major countries with photo requirements
- **Document Type**: Passport, Visa, Driver License, ID Card
- **Compliance Checking**: Real-time validation against country-specific rules
- **Results Display**: Detailed compliance report with issues and recommendations

### Backend (Cloudflare Workers)
- **Compliance Check Worker**: AI-powered photo analysis
- **Country Rules Worker**: Serves country-specific requirements
- **Image Storage**: Cloudflare Images for secure photo storage
- **KV Storage**: Results caching and audit logs

## Project Structure

```
SnapItID/
├── iOS/
│   └── SnapItID/
│       ├── App/
│       │   └── SnapItIDApp.swift
│       ├── Views/
│       │   ├── ContentView.swift
│       │   ├── PhotoSelectionView.swift
│       │   ├── CountrySelectionView.swift
│       │   ├── DocumentTypeSelectionView.swift
│       │   └── ComplianceResultView.swift
│       ├── ViewModels/
│       │   └── PhotoCaptureViewModel.swift
│       ├── Models/
│       │   └── PhotoModels.swift
│       ├── Services/
│       │   └── CloudflareService.swift
│       └── Utils/
├── backend/
│   └── workers/
│       ├── compliance-check/
│       │   └── index.ts
│       ├── country-rules/
│       │   └── index.ts
│       └── wrangler.toml
└── README.md
```

## Phase 1 Features

### 1. Photo Capture & Upload
- Take photo with device camera
- Select from photo library
- Automatic JPEG compression (0.8 quality)
- Upload to Cloudflare Images

### 2. Country & Document Type Selection
- Support for 12+ major countries
- Document types: Passport, Visa, Driver License, ID Card
- Country-specific rule validation

### 3. AI Compliance Engine
- Real-time photo analysis
- Validation against ICAO standards
- Issues detection:
  - Head size
  - Eye position
  - Glasses reflection
  - Smile detection
  - Shadow detection
  - Ear visibility
  - Hair obstruction
  - Exposure
  - Background quality
  - Resolution

### 4. Compliance Scoring
- 0-100 compliance score
- Critical/Warning/Info severity levels
- Recommendations for improvement
- Processing time tracking

### 5. Results Display
- Pass/Fail indication
- Detailed issue list
- Actionable recommendations
- Retry functionality

## Setup Instructions

### iOS Development
1. Open Xcode 15+
2. Clone repository
3. Open `SnapItID` folder
4. Set up Cloudflare credentials in `CloudflareService.swift`
5. Configure environment variables:
   - `CLOUDFLARE_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`

### Cloudflare Workers Deployment
1. Install Wrangler CLI: `npm install -g wrangler`
2. Navigate to `backend/workers`
3. Configure `wrangler.toml` with:
   - Your Cloudflare Account ID
   - Your Zone ID
   - KV Namespace binding
4. Deploy:
   ```bash
   wrangler deploy --env production
   ```

### Environment Configuration

#### iOS (CloudflareService.swift)
```swift
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

#### Cloudflare Workers (wrangler.toml)
```toml
account_id = "YOUR_ACCOUNT_ID"
zone_id = "YOUR_ZONE_ID"

[[kv_namespaces]]
binding = "SNAPITID_KV"
id = "YOUR_KV_ID"
```

## API Endpoints

### POST /api/compliance/check
Check photo compliance against country rules

**Request:**
```json
{
  "photoID": "cloudflare_image_id",
  "countryCode": "US",
  "documentType": "PASSPORT"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "result_xxx",
    "isCompliant": true,
    "complianceScore": 92,
    "issues": [],
    "recommendations": [],
    "processingTime": 2.5,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/rules/{countryCode}
Get country-specific photo requirements

**Response:**
```json
{
  "success": true,
  "result": {
    "countryCode": "US",
    "countryName": "United States",
    "passportSize": {
      "width": 35,
      "height": 45,
      "headHeight": 288
    },
    "backgroundColorRequirement": "WHITE",
    "smileAllowed": false,
    "glassesAllowed": false
  }
}
```

## Next Steps - Phase 2

- [ ] ML model integration for AI compliance
- [ ] Additional country support (50+)
- [ ] Print template generation
- [ ] History & retry management
- [ ] Enterprise API tier
- [ ] Multi-language support
- [ ] Android app development

## Technology Stack

### Frontend
- Swift 5.9+
- SwiftUI
- Combine
- Photos framework

### Backend
- Cloudflare Workers (TypeScript)
- Cloudflare Images
- Cloudflare KV
- Cloudflare D1 (future)

### Infrastructure
- Domain: snapitid.ai
- CDN: Cloudflare
- Image Storage: Cloudflare Images
- Database: Cloudflare D1 (planned)

## Contributing
Instructions for team contribution coming soon.

## License
MIT License - See LICENSE file for details

## Support
For issues and questions, contact: support@snapitid.ai
