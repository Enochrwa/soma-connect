# ⚡ Quick Reference: CLIENT_URL Fixes

## 🎯 What Was Fixed

✅ **OAuth Redirect URLs** - No longer malformed with commas  
✅ **WebSocket CORS** - Properly parses multiple origins  
✅ **Type Safety** - New `BASE_URL` for redirects, `CLIENT_URL` for CORS  

---

## 📦 Branch Details

```
Branch:  feature/fix-client-url
Commits: 3
  1. Fix code (server/src/ - 3 files)
  2. Add detailed summary (FIX_SUMMARY.md)
  3. Add comparison guide (BEFORE_AFTER_COMPARISON.md)

Status: ✅ Pushed to GitHub
URL:    https://github.com/Enochrwa/soma-connect/tree/feature/fix-client-url
```

---

## 🔧 Files Modified

| File | Change | Impact |
|------|--------|--------|
| `server/src/config/env.ts` | Added `BASE_URL` export | Provides canonical URL |
| `server/src/routes/auth.routes.ts` | Use `BASE_URL` in redirects | OAuth calls work correctly |
| `server/src/socket/index.ts` | Parse `CLIENT_URL` to array | WebSocket CORS allows all origins |

---

## 💡 How to Use

### Configuration
```bash
# Single domain (development)
CLIENT_URL=http://localhost:5173

# Multiple domains (production)
CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw

# Multiple domains with staging (advanced)
CLIENT_URL=https://prod.com,https://www.prod.com,http://localhost:3000
```

### Code Usage
```typescript
import { env } from "./config/env";

// For redirects / OAuth callbacks
const redirectUrl = `${env.BASE_URL}/auth/google/callback`;
// Result: "https://oneafricashop.net.rw/auth/google/callback"

// For CORS (already handled in app.ts and socket/index.ts)
// Both domains in CLIENT_URL are automatically supported

// For environment variables
console.log(env.CLIENT_URL);  // "url1,url2,url3"
console.log(env.BASE_URL);    // "url1" (canonical)
```

---

## 🧪 Quick Test

### Test 1: OAuth Redirect
```bash
# Set environment
export CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw
export GOOGLE_CLIENT_ID=your_id
export GOOGLE_CLIENT_SECRET=your_secret

# Start server
npm run dev

# Trigger OAuth failure
# Expected: Redirects to https://oneafricashop.net.rw/login?error=google ✅
```

### Test 2: WebSocket Connection
```bash
# In browser console, check WebSocket origin
// Should connect from any configured origin ✅
// Check Network tab → WS (WebSocket)
```

### Test 3: Verify env variables
```typescript
// In server code
console.log(env.BASE_URL);      // Single URL ✅
console.log(env.CLIENT_URL);    // Comma-separated ✅
```

---

## 🚀 Deployment Steps

### 1. Merge the branch
```bash
git checkout main
git merge feature/fix-client-url
```

### 2. Update your deployment env vars
```bash
# Before
CLIENT_URL=https://oneafricashop.net.rw

# After (for multiple domains)
CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw
```

### 3. Verify after deployment
- ✅ OAuth login works from both domains
- ✅ WebSocket connects from both domains
- ✅ No DNS errors in browser console

---

## ❓ FAQ

**Q: Do I need to change anything if I have a single domain?**  
A: No! It works exactly as before. `BASE_URL` automatically equals `CLIENT_URL`.

**Q: What if I add spaces in the comma-separated list?**  
A: That's fine! The parser trims whitespace automatically.  
`"https://example.com , https://www.example.com"` works correctly.

**Q: Can I use environment variables?**  
A: Only for the initial `CLIENT_URL` env var. The parsing happens at startup.

**Q: What URL does OAuth use for redirects?**  
A: The first URL in the list (the canonical `BASE_URL`).

**Q: Can I change which URL is "canonical"?**  
A: Not automatically, but you can edit `parseClientUrls()` in `env.ts` if needed.

**Q: Are the changes backward compatible?**  
A: Yes! All existing single-URL configurations work unchanged.

---

## 📝 Commit Messages

```
64f3fc4 docs: add before/after comparison for CLIENT_URL fixes
223c978 docs: add comprehensive CLIENT_URL fix summary
4d74d25 fix(auth,socket): properly handle comma-separated CLIENT_URL for OAuth and CORS
        BREAKING CHANGE: Introduced BASE_URL derived from CLIENT_URL
```

---

## 🔍 Important Notes

⚠️ **Check Your Google OAuth Settings**
```
Google Cloud Console → Credentials → OAuth 2.0 Client IDs
Authorized Redirect URIs must include BOTH:
- https://oneafricashop.net.rw/api/auth/google/callback
- https://www.oneafricashop.net.rw/api/auth/google/callback (if applicable)
```

⚠️ **Verify GOOGLE_CALLBACK_URL**
```env
# This can be set independently if different from BASE_URL
GOOGLE_CALLBACK_URL=https://oneafricashop.net.rw/api/auth/google/callback
```

✅ **CORS is Automatic**
All URLs in `CLIENT_URL` are automatically allowed for:
- CORS requests
- CSP headers
- Socket.io connections

---

## 📚 Related Documentation

- **FIX_SUMMARY.md** - Detailed explanation of all changes
- **BEFORE_AFTER_COMPARISON.md** - Visual comparison of broken vs fixed code
- **server/src/config/env.ts** - Environment configuration source code
- **server/src/routes/auth.routes.ts** - OAuth route implementation
- **server/src/socket/index.ts** - WebSocket initialization

---

## ✅ Checklist Before Merging

- [ ] All 3 files in feature branch
- [ ] No conflicting changes in main
- [ ] Google OAuth credentials are set
- [ ] Both domain variants work
- [ ] Local testing passes
- [ ] CI/CD pipeline passes (if applicable)

---

## 🎉 Summary

Your `soma-connect` application now properly handles multiple client domains:

- **OAuth**: Uses canonical base URL (no more malformed URLs)
- **WebSocket**: Accepts all configured origins
- **CORS**: All origins in `CLIENT_URL` are whitelisted
- **Type Safety**: New `BASE_URL` export for clarity
- **Backward Compatible**: Single domains work as before

Ready to merge and deploy! 🚀
