# Admin Authentication Setup Guide

## What Was Implemented

I've set up a server-side admin authentication system using JWT tokens to securely access the leads data. This replaces the client-side Firestore access with secure server-side API calls.

## Files Created

### 1. `/lib/adminServerVerify.ts`
- Verifies JWT tokens from cookies on the server
- Checks if the token is valid and has admin role
- Used by protected API routes

### 2. `/app/api/admin/leads/route.ts`
- Server API endpoint that fetches leads from Firestore using Firebase Admin SDK
- Requires valid admin JWT token in cookies
- Returns leads data as JSON

### 3. Updated `/components/admin/leads-analytics.tsx`
- Changed from client-side Firestore queries to server API calls
- Removed direct Firebase client imports
- Calls `/api/admin/leads` with credentials to fetch data

## Setup Instructions

### Step 1: Add Environment Variable

You need to add the `ADMIN_JWT_SECRET` environment variable:

1. Go to your Vercel project settings → Environment Variables
2. Add a new variable:
   - **Name**: `ADMIN_JWT_SECRET`
   - **Value**: Generate a strong random secret (e.g., using `openssl rand -base64 32`)
   
Example:
\`\`\`
ADMIN_JWT_SECRET=your-super-secret-key-here-minimum-32-chars
\`\`\`

### Step 2: Generate Admin Token

When a user logs in as admin, you need to generate a JWT token and set it as a cookie:

\`\`\`typescript
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

// In your admin login route:
const token = jwt.sign(
  { role: 'admin', email: 'admin@example.com' },
  process.env.ADMIN_JWT_SECRET as string,
  { expiresIn: '24h' }
)

const cookieStore = await cookies()
cookieStore.set('admin_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60, // 24 hours
})
\`\`\`

### Step 3: Test the Setup

1. Login to the admin dashboard
2. Open browser DevTools → Console
3. Run this command:
\`\`\`javascript
fetch("/api/admin/leads", { credentials: "include" })
  .then(r => r.json())
  .then(console.log)
\`\`\`

You should see a response with `{leads: [...]}`.

## Security Features

✅ Server-side token verification (can't be bypassed from client)
✅ JWT tokens with expiration
✅ HTTP-only cookies (protected from XSS)
✅ Admin SDK uses service account credentials (more secure than client SDK)
✅ API endpoint requires valid token to access leads data

## Next Steps

1. Add `ADMIN_JWT_SECRET` to your environment variables
2. Update your admin login endpoint to generate JWT tokens as shown above
3. Test the setup using the browser console command
4. Remove any remaining client-side Firestore queries for admin data
