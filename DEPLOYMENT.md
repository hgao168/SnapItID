# SnapItID Deployment Guide

## Prerequisites
- Cloudflare account with Workers enabled
- Node.js 18+ installed
- Wrangler CLI installed: `npm install -g wrangler`
- iOS 15.0+ development setup
- Xcode 15+

## Step 1: Cloudflare Configuration

### 1.1 Create Cloudflare Account
1. Sign up at https://dash.cloudflare.com
2. Add your domain (snapitid.ai)
3. Update nameservers at your registrar

### 1.2 Get API Credentials
1. Go to Account Settings > API Tokens
2. Create API Token with these permissions:
   - Account > Cloudflare Workers > Edit
   - Account > Cloudflare Images > Edit
   - Zone > Zone > Read
3. Copy your Account ID and API Token

### 1.3 Set up Cloudflare Images
1. Go to Images > Overview
2. Enable Cloudflare Images
3. Note your Account ID

### 1.4 Create KV Namespace
1. Go to Workers > KV Namespaces
2. Create namespace: `snapitid-kv-prod`
3. Create namespace: `snapitid-kv-staging`
4. Copy namespace IDs

## Step 2: Deploy Cloudflare Workers

```bash
# Navigate to workers directory
cd backend/workers

# Install dependencies
npm install

# Configure wrangler.toml with your IDs
# Update:
# - account_id
# - zone_id (from domain)
# - KV namespace IDs

# Deploy compliance-check worker
wrangler deploy compliance-check --env production

# Deploy country-rules worker
wrangler deploy country-rules --env production

# Verify deployment
curl https://api.snapitid.ai/api/rules/US
```

## Step 3: Configure iOS App

### 3.1 Set Environment Variables
```bash
# Create .env file in iOS/SnapItID/
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### 3.2 Update CloudflareService.swift
Replace placeholder values in `Services/CloudflareService.swift`:
- `baseURL`: Your Cloudflare API endpoint
- `accountID`: Your Cloudflare Account ID
- `apiKey`: Your API key (from environment)

### 3.3 Build & Run
```bash
# Open project in Xcode
open iOS/SnapItID.xcodeproj

# Select target device/simulator
# Build: Cmd + B
# Run: Cmd + R
```

## Step 4: Testing

### 4.1 Test API Endpoints
```bash
# Test country rules
curl -H "Accept: application/json" \
  https://api.snapitid.ai/api/rules/US

# Test compliance check (requires valid photo ID)
curl -X POST https://api.snapitid.ai/api/compliance/check \
  -H "Content-Type: application/json" \
  -d '{
    "photoID": "test-image-id",
    "countryCode": "US",
    "documentType": "PASSPORT"
  }'
```

### 4.2 Test iOS App
1. Select simulator (iPhone 15 or later)
2. Run app
3. Select country
4. Select document type
5. Upload test photo
6. Verify compliance check response

## Step 5: Domain Configuration

### 5.1 DNS Setup
1. Point snapitid.ai to Cloudflare nameservers
2. Create DNS records:
```
A record: snapitid.ai -> Cloudflare IP
CNAME: api.snapitid.ai -> your-worker.snapitid.ai
CNAME: www.snapitid.ai -> snapitid.ai
```

### 5.2 SSL/TLS
- Cloudflare automatically provides SSL
- Ensure "Full" or "Full (strict)" SSL mode

## Monitoring & Debugging

### Cloudflare Dashboard
- Workers > Inspect: View real-time logs
- Analytics: Monitor requests and errors

### iOS Console
```bash
# View live logs
log stream --process SnapItID

# Filter compliance-related logs
log stream --process SnapItID | grep -i compliance
```

## Rollback Procedure

### Rollback Workers
```bash
# View deployment history
wrangler rollback --env production

# Rollback to specific version
wrangler rollback --env production --message "Rollback to previous version"
```

### Rollback iOS App
- Revert to previous App Store version
- Or rebuild from git commit

## Troubleshooting

### Issue: Workers not responding
```bash
# Check deployment status
wrangler deployments list --env production

# Check logs
wrangler tail --env production

# Redeploy
wrangler deploy --env production
```

### Issue: Image upload fails
- Verify Cloudflare Images is enabled
- Check API credentials
- Verify KV namespace binding

### Issue: Compliance check timeout
- Check Workers execution time
- Optimize AI model calls
- Add request caching

## Performance Optimization

### 1. Enable Caching
```
Cache-Control: public, max-age=3600
```

### 2. Compress Images
- Use JPEG compression (0.8 quality)
- Target <2MB per upload

### 3. Optimize Workers
- Use TypeScript for type safety
- Minimize dependencies
- Cache country rules

## Security Checklist

- [ ] Environment variables configured
- [ ] API keys rotated monthly
- [ ] CORS headers configured
- [ ] Rate limiting enabled
- [ ] SSL certificate valid
- [ ] No sensitive data in logs
- [ ] Workers code reviewed
- [ ] Dependencies updated

## Support

For deployment issues:
1. Check Cloudflare Dashboard
2. Review worker logs
3. Contact Cloudflare Support
4. Email: deployment@snapitid.ai
