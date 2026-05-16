# Quick Start Guide - SnapItID iOS MVP

## 5-Minute Setup

### Prerequisites
- Mac with Xcode 15+
- iOS 15+ device or simulator
- Cloudflare account

### Step 1: Prepare Environment
```bash
cd ~/ADO/SnapItID

# Create .env file
cp .env.example .env

# Edit with your credentials
nano .env
```

### Step 2: Update API Configuration
Open `iOS/SnapItID/Services/CloudflareService.swift` and update:
```swift
self.baseURL = "https://api.snapitid.ai"
self.apiKey = ProcessInfo.processInfo.environment["CLOUDFLARE_API_KEY"] ?? ""
self.accountID = ProcessInfo.processInfo.environment["CLOUDFLARE_ACCOUNT_ID"] ?? ""
```

### Step 3: Deploy Backend
```bash
cd backend/workers

# Install dependencies
npm install

# Update wrangler.toml with your Cloudflare info
# Deploy
wrangler deploy --env production
```

### Step 4: Run iOS App
```bash
# Navigate to iOS folder
cd iOS

# Open in Xcode
open .

# Select simulator/device
# Press Cmd+R to run
```

## App Flow

1. **Launch** → See SnapItID home screen
2. **Select Country** → Choose from dropdown (US, CA, GB, etc.)
3. **Select Document** → Passport, Visa, Driver License, or ID Card
4. **Upload Photo** → Take photo or select from library
5. **Check Compliance** → App sends to Cloudflare for AI analysis
6. **View Results** → See score, issues, and recommendations

## Features Included

✅ Photo capture from camera  
✅ Photo library integration  
✅ Country-specific validation  
✅ Multiple document types  
✅ Real-time compliance checking  
✅ AI-powered issue detection  
✅ Detailed recommendations  
✅ Cloudflare backend integration  

## API Endpoints Available

```
GET  /api/rules/{countryCode}
POST /api/compliance/check
```

## Testing the API Manually

```bash
# Get US photo rules
curl https://api.snapitid.ai/api/rules/US

# Check compliance (replace with real image ID)
curl -X POST https://api.snapitid.ai/api/compliance/check \
  -H "Content-Type: application/json" \
  -d '{
    "photoID": "test-id",
    "countryCode": "US",
    "documentType": "PASSPORT"
  }'
```

## Supported Countries (Phase 1)

| Code | Country |
|------|---------|
| US | United States |
| CA | Canada |
| GB | United Kingdom |
| DE | Germany |
| FR | France |
| JP | Japan |
| AU | Australia |
| NZ | New Zealand |
| SG | Singapore |
| CN | China |
| IN | India |
| BR | Brazil |

## Document Types

- Passport
- Visa
- Driver License
- ID Card

## Compliance Checks

The AI engine validates:
- ✓ Face detection and positioning
- ✓ Head size (ICAO standards)
- ✓ Eye alignment and position
- ✓ Glasses reflection detection
- ✓ Smile/expression detection
- ✓ Shadow detection
- ✓ Ear visibility
- ✓ Hair obstruction
- ✓ Exposure level
- ✓ Background quality
- ✓ Image resolution
- ✓ Country-specific rules

## Scoring System

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | ✓ Compliant | Ready to submit |
| 60-79 | ⚠ Warnings | Review suggestions |
| 0-59 | ✗ Not Compliant | Retake photo |

## Troubleshooting

### Photo won't upload
- Check internet connection
- Verify Cloudflare API credentials
- Check image file size (should be <2MB after compression)

### Compliance check takes too long
- Network latency - try again
- Cloudflare Workers may be initializing
- Check API endpoint is live

### Country not in dropdown
- More countries coming in Phase 2
- Current MVP supports 12 major countries

### "Missing required fields" error
- Ensure country and document type are selected
- Verify photo was uploaded successfully

## Next Steps

1. **Add more countries** → Update country rules in API
2. **Improve AI model** → Integrate ML vision model
3. **Build web version** → React frontend for browser
4. **Add history** → Store submissions in database
5. **Print templates** → Generate printable photo formats
6. **Enterprise API** → B2B integration tier

## Project Links

- **GitHub**: https://github.com/hgao168/SnapItID
- **Domain**: https://snapitid.ai
- **Documentation**: See README.md
- **Deployment**: See DEPLOYMENT.md

## Support

📧 Email: support@snapitid.ai  
🐛 Issues: GitHub Issues  
💬 Discussions: GitHub Discussions

---
**Version**: 0.1.0 (MVP - Phase 1)  
**Last Updated**: 2024-01-15
