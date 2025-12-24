# Manual Lambda Deployment Guide

### Step 1: Build the Function

```bash
cd lambda-email-proxy
npm install
npm run build
```

This creates `dist/index.js` (281KB bundled file).

### Step 2: Create Deployment Package

```bash
cd dist
zip lambda.zip index.js
```

### Step 3: Upload to AWS Lambda

#### Option A: Via AWS Console

1. Go to AWS Lambda Console
2. Create new function:
   - **Function name**: `ooo-email-proxy`
   - **Runtime**: Node.js >= 20.x
3. In "Code" tab:
   - Click "Upload from" → ".zip file"
   - Upload `lambda.zip`

### Step 4: Configure Environment Variables

In Lambda Console → Configuration → Environment variables:

```
API_KEY=YOUR_API_KEY // from openssl random 32 bytes, matching the one in the frontend
RESEND_API_KEY=YOUR_RESEND_API_KEY // from Resend
RESEND_FROM_EMAIL=YOUR_FROM_EMAIL // from Resend
```

### Step 5: Enable Function URL (For testing)

1. Go to Configuration → Function URL
2. Click "Create function URL"
3. Settings:
   - **Auth type**: NONE
   - **CORS**: Enable
   - **Allow origins**: `*` (or your domain)
   - **Allow methods**: POST
   - **Allow headers**: `Content-Type`
4. Save
5. Copy the Function URL
