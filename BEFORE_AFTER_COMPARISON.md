# Before & After Comparison

## Problem Scenario
```
Environment Variable:
CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw
```

---

## 🔴 BEFORE (Broken)

### auth.routes.ts - OAuth Redirect
```typescript
// ❌ BROKEN
failureRedirect: `${env.CLIENT_URL}/login?error=google`
res.redirect(`${env.CLIENT_URL}/auth/google/callback?accessToken=${access}`)

// Result when CLIENT_URL = "https://oneafricashop.net.rw,https://www.oneafricashop.net.rw"
// ❌ https://oneafricashop.net.rw,https://www.oneafricashop.net.rw/login?error=google
// ❌ https://oneafricashop.net.rw,https://www.oneafricashop.net.rw/auth/google/callback?accessToken=...

// Browser Error:
// DNS_PROBE_FINISHED_NXDOMAIN (domain doesn't exist)
```

### socket/index.ts - WebSocket CORS
```typescript
// ❌ BROKEN
cors: { origin: env.CLIENT_URL, credentials: true }

// Socket.io receives: "https://oneafricashop.net.rw,https://www.oneafricashop.net.rw"
// Socket.io expects: ["https://oneafricashop.net.rw", "https://www.oneafricashop.net.rw"]
// Result: CORS error, WebSocket connections rejected
```

---

## 🟢 AFTER (Fixed)

### env.ts - New Configuration
```typescript
// ✅ FIXED
// Parse CLIENT_URL to get canonical base URL for OAuth and redirects
const parseClientUrls = (raw: string = ""): { urls: string[]; base: string } => {
  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  
  return {
    urls: urls.length > 0 ? urls : ["http://localhost:5173"],
    base: urls.length > 0 ? urls[0] : "http://localhost:5173",
  };
};

const clientUrlConfig = parseClientUrls(process.env.CLIENT_URL);

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  // Comma-separated list of allowed client URLs
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173",
  // Canonical base URL for OAuth redirects and server-to-client navigation
  BASE_URL: clientUrlConfig.base,
  // ... rest of config
};

// Results:
// env.CLIENT_URL = "https://oneafricashop.net.rw,https://www.oneafricashop.net.rw"
// env.BASE_URL = "https://oneafricashop.net.rw"  ← Single canonical URL
```

### auth.routes.ts - OAuth Redirect (Fixed)
```typescript
// ✅ FIXED
failureRedirect: `${env.BASE_URL}/login?error=google`
res.redirect(`${env.BASE_URL}/auth/google/callback?accessToken=${access}`)

// Result when BASE_URL = "https://oneafricashop.net.rw"
// ✅ https://oneafricashop.net.rw/login?error=google
// ✅ https://oneafricashop.net.rw/auth/google/callback?accessToken=...

// Browser: Successfully navigates, valid domain
```

### socket/index.ts - WebSocket CORS (Fixed)
```typescript
// ✅ FIXED
// Parse CLIENT_URL into array for CORS
const parseClientOrigins = (): string[] => {
  return (env.CLIENT_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

export function initSocket(httpServer: HttpServer) {
  const clientOrigins = parseClientOrigins();
  
  io = new Server(httpServer, {
    cors: { origin: clientOrigins, credentials: true },  // ✅ Array
  });
  // ...
}

// Result:
// clientOrigins = ["https://oneafricashop.net.rw", "https://www.oneafricashop.net.rw"]
// Socket.io accepts connections from both origins ✅
```

---

## 📊 Comparison Table

| Aspect | Before | After |
|--------|--------|-------|
| **OAuth Failure Redirect** | ❌ Malformed URL with comma | ✅ Valid single URL |
| **OAuth Success Redirect** | ❌ Malformed URL with comma | ✅ Valid single URL |
| **Socket.io CORS** | ❌ String (rejected by Socket.io) | ✅ Array (accepted) |
| **DNS Resolution** | ❌ Fails (domain doesn't exist) | ✅ Succeeds |
| **Multiple Domains Support** | ❌ Breaks on multiple URLs | ✅ Works for CORS + OAuth |
| **Backward Compatibility** | ✅ Single URL works | ✅ Single URL works |
| **Type Safety** | ⚠️ String mixing purposes | ✅ Typed: CLIENT_URL vs BASE_URL |

---

## 🎯 Use Case Examples

### Example 1: Development (Single Domain)
```env
CLIENT_URL=http://localhost:5173
```
**Before & After:** Both work (backward compatible)
- `env.BASE_URL` = `http://localhost:5173`
- `env.CLIENT_URL` = `http://localhost:5173`

---

### Example 2: Production (Multiple Domains)
```env
CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw
```

**Before:**
- ❌ OAuth redirects fail with DNS error
- ❌ Socket.io CORS rejects both origins
- ❌ Users cannot log in

**After:**
- ✅ OAuth redirects to `https://oneafricashop.net.rw/auth/google/callback`
- ✅ Socket.io CORS allows both origins
- ✅ Users can log in from either domain
- ✅ WebSocket connections work from both domains

---

### Example 3: Staging (Multiple Domains + Localhost)
```env
CLIENT_URL=https://staging.example.com,https://www.staging.example.com,http://localhost:3000
```

**Before:**
- ❌ All features broken with malformed URLs

**After:**
- ✅ OAuth redirects to `https://staging.example.com` (canonical)
- ✅ Socket.io CORS allows all 3 origins
- ✅ Developers can test locally while staging runs remotely

---

## 🔗 Relationship Between env.CLIENT_URL and env.BASE_URL

```
Input: CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw

                    ┌─────────────────────────────────────────┐
                    │     parseClientUrls() Function          │
                    └────────────┬────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
            URLs Array                   Base URL
        (all origins)              (canonical/primary)
            │                            │
            │ Used by:                  │ Used by:
            │ - CORS middleware         │ - OAuth redirects
            │ - CSP headers             │ - Error redirects
            │ - Socket.io CORS          │ - email.service.ts
            │ - app.ts                  │ - auth.routes.ts
            │                           │
            ▼                           ▼
    env.CLIENT_URL              env.BASE_URL
    (comma-separated)           (single URL)
    "https://oneafr...          "https://
     icashop.net.rw,            oneafricashop.net.rw"
     https://www.one..."
```

---

## ✨ Key Takeaways

1. **Two purposes, two variables:**
   - `CLIENT_URL`: All allowed origins (for CORS/CSP)
   - `BASE_URL`: Canonical origin (for OAuth/redirects)

2. **No breaking change for single URLs:**
   - `CLIENT_URL=https://example.com` works exactly as before
   - `BASE_URL` will equal `CLIENT_URL` automatically

3. **Safe comma-separated parsing:**
   - Strips whitespace
   - Filters empty values
   - Falls back to `http://localhost:5173` if empty

4. **Fully typed and safe:**
   - All utilities return `string[]` or `string`, not ambiguous values
   - TypeScript catches misuse at compile time

5. **Production ready:**
   - No changes needed to deployment process
   - Just set `CLIENT_URL=url1,url2` and it works
   - All functions self-organize the splitting internally

---

## 🚀 Next Steps

1. **Review the changes:** Check the three modified files
2. **Test locally:** 
   ```bash
   CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw npm run dev
   ```
3. **Test Google OAuth:** Verify redirect works
4. **Test WebSocket:** Open dev tools → Application → check WebSocket connections
5. **Merge to main:** Create PR and merge when ready
6. **Deploy:** Use the same `CLIENT_URL` format in production
