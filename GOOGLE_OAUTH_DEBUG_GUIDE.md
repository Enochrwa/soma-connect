# 🐛 Google OAuth Callback Error Debugging Guide

## The Real Problem You Had

Your Google OAuth callback was returning `{"error":"Something went wrong on our end."}` because:

**Your code had NO error handling or logging** - any crash inside the callback route was swallowed silently.

### Root Causes (Most Common First)

1. **JWT Secrets Missing** (MOST LIKELY on Render)
   - `JWT_ACCESS_SECRET` not set
   - `JWT_REFRESH_SECRET` not set
   - Token signing would crash silently

2. **Passport Not Returning User**
   - User record wasn't created/found in database
   - MongoDB validation error
   - Passport strategy error

3. **Missing User Fields**
   - User object missing `_id`
   - User missing required MongoDB fields

4. **Unhandled Database Errors**
   - Duplicate key error
   - Validation error during user creation

---

## ✅ What Was Fixed

### File 1: `server/src/config/passport.ts`

**Added comprehensive error logging at every step:**

```typescript
// Now logs:
✅ When verify function starts
✅ Profile data being extracted
✅ Database lookups
✅ User creation/linking
✅ Any error that occurs

// Example log output:
"Passport verify: Starting Google profile processing"
"Passport verify: Profile data extracted"
"Passport verify: Search by googleId result"
"Passport verify: Found existing user by email"
"Passport verify: Creating new user account from Google"
"Passport verify: Success, calling done()"
// OR
"Passport verify: Error in Google strategy" { error: "..." }
```

**Benefits:**
- You can now see exactly where the flow breaks
- All database operations are logged
- Error messages include actual error details

### File 2: `server/src/routes/auth.routes.ts`

**Added complete error handling to callback route:**

```typescript
// Now checks for:
✅ req.user exists (Passport succeeded)
✅ user._id exists (valid user object)
✅ JWT_ACCESS_SECRET is configured
✅ JWT_REFRESH_SECRET is configured
✅ Token signing succeeds
✅ Redirect succeeds

// If any step fails:
- Logs the exact error with details
- Returns meaningful error message
- Shows which configuration is missing
```

**Benefits:**
- No more silent crashes
- Clear error messages that point to the problem
- Easy to diagnose from error response

---

## 🔍 How to Debug Using the Logs

### Step 1: Go to Render Dashboard
```
https://dashboard.render.com/services
```

### Step 2: Select Your Service
```
soma-connect-api (or whatever it's named)
```

### Step 3: Click "Logs" Tab

### Step 4: Search for Your Debug Information

#### If you see: "Passport verify: Starting Google profile processing"
- ✅ Passport is working
- ✅ Google sent profile data
- Problem is downstream

#### If you see: "Passport verify: Profile data extracted"
- ✅ Google profile data is valid
- ✅ Email and name extracted successfully
- Problem might be database

#### If you see: "Passport verify: Creating new user account from Google"
- ✅ User is being created
- If it stops here, check MongoDB error next

#### If you see: "Passport verify: Error in Google strategy"
- ✅ Found the problem!
- ✅ Read the error message - it will tell you exactly what failed

#### If you see: "Google callback: JWT_ACCESS_SECRET not configured"
- ❌ Missing environment variable on Render
- Solution: Add `JWT_ACCESS_SECRET` to Render config

#### If you see: "Google callback: No user returned from Passport"
- ❌ Passport strategy failed
- Check the Passport verify logs above this message

---

## 🚨 Common Error Messages & Fixes

### Error: "JWT_ACCESS_SECRET not configured"
**Cause:** Missing environment variable

**Fix:**
1. Go to Render Dashboard
2. Select your service
3. Go to "Environment" tab
4. Add: `JWT_ACCESS_SECRET=your-secret-here`
5. Redeploy

```env
JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me
```

---

### Error: "User record is invalid" / "User missing _id"
**Cause:** User object from database is corrupt or incomplete

**Fix:**
1. Check MongoDB connection: is `MONGO_URI` correct?
2. Check User model fields: does User schema require `_id`?
3. Try creating a new user manually via API

---

### Error: "No user returned from Passport"
**Cause:** Passport verify function failed silently or returned null

**Fix:**
Check the Render logs for "Passport verify: Error in Google strategy"
- If it's a MongoDB error: Check `MONGO_URI` and network access
- If it's a profile error: Check if `email` is missing from Google profile
- If it's validation error: Check User model constraints

---

### Error: "Authentication failed: no user returned"
**Cause:** Passport didn't set `req.user`

**Fix:**
This usually means Passport strategy failed. Check logs for:
```
"Passport verify: Error in Google strategy"
```

---

## 📋 Environment Variables Checklist

Make sure ALL of these are set on Render:

```env
# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://api.oneafricashop.net.rw/api/auth/google/callback

# JWT (CRITICAL!)
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Database
MONGO_URI=mongodb+srv://...

# Client URLs
CLIENT_URL=https://oneafricashop.net.rw,https://www.oneafricashop.net.rw

# Other
NODE_ENV=production
PORT=4000
```

---

## 🧪 Testing Steps (After Fix)

### Test 1: Check Logs Are Working
```
1. Trigger OAuth login
2. Go to Render logs
3. Search for "Passport verify"
4. You should see detailed logs
```

### Test 2: Test With Valid Google Account
```
1. Click "Sign in with Google"
2. Use a Google account you control
3. Check if redirect works
4. If it fails, check logs for exact error
```

### Test 3: Check Environment Variables
```bash
# SSH into Render and verify:
echo $JWT_ACCESS_SECRET
echo $JWT_REFRESH_SECRET

# Should NOT be empty!
```

---

## 🐛 Troubleshooting Flowchart

```
Google OAuth Callback Failing
│
├─ Do you see logs? (In Render dashboard)
│  ├─ NO → Check if service is running and logs are enabled
│  └─ YES ↓
│
├─ Do you see "Passport verify: Starting..."?
│  ├─ NO → Google isn't sending data (check GOOGLE_CALLBACK_URL)
│  └─ YES ↓
│
├─ Do you see "Passport verify: Error in Google strategy"?
│  ├─ YES → Database or user creation error (check MONGO_URI)
│  └─ NO ↓
│
├─ Do you see "Passport verify: Success"?
│  ├─ NO → Passport returned null (check Profile validation)
│  └─ YES ↓
│
├─ Do you see "Google callback: JWT_ACCESS_SECRET not configured"?
│  ├─ YES → Add missing env vars to Render (CRITICAL!)
│  └─ NO ↓
│
└─ Do you see "Google callback error"?
   ├─ YES → Read the error message, that's your answer!
   └─ NO → Redirect should have succeeded ✅
```

---

## 📝 Log Examples

### ✅ Successful Login Flow (What You Want to See)

```
Passport verify: Starting Google profile processing { googleId: 'xxx', email: 'user@example.com' }
Passport verify: Profile data extracted { email: 'user@example.com', name: 'John Doe', avatar: true }
Passport verify: Search by googleId result { found: false }
Passport verify: Found existing user by email, linking Google account
Passport verify: User updated with Google ID
Passport verify: Success, calling done() { userId: '507f1f77bcf86cd799439011' }
```

Then (in the callback route):

```
Google callback: Setting tokens and redirecting
```

Then: **Redirect to** `https://oneafricashop.net.rw/auth/google/callback?accessToken=eyJ...`

### ❌ Failed Login Flow (What To Fix)

Example 1 - Missing JWT Secret:
```
Passport verify: Starting Google profile processing { googleId: 'xxx', email: 'user@example.com' }
Passport verify: Profile data extracted { email: 'user@example.com', name: 'John Doe', avatar: false }
Passport verify: Search by googleId result { found: false }
Passport verify: Creating new user account from Google
Passport verify: New user created { userId: '507f1f77bcf86cd799439011', email: 'user@example.com' }
Passport verify: Success, calling done() { userId: '507f1f77bcf86cd799439011' }
Google callback: JWT_ACCESS_SECRET not configured
```

**Fix:** Add `JWT_ACCESS_SECRET` to Render environment

Example 2 - Database Error:
```
Passport verify: Starting Google profile processing { googleId: 'xxx', email: 'user@example.com' }
Passport verify: Profile data extracted { email: 'user@example.com', name: 'John Doe', avatar: false }
Passport verify: Search by googleId result { found: false }
Passport verify: Creating new user account from Google
Passport verify: Error in Google strategy { 
  error: 'E11000 duplicate key error collection: soma_market.users index: email_1',
  stack: '...'
}
```

**Fix:** User with that email already exists. Either:
- Use different email in Google
- Delete old user from database
- Check for duplicate emails

---

## 🎯 Summary

### What Changed
1. **Passport strategy** now logs every step
2. **Callback route** now validates everything and has try-catch
3. **Errors** are now logged with full details

### How to Use
1. Trigger Google login
2. Check Render logs
3. Look for error messages
4. Read this guide to understand what failed
5. Fix the issue

### Result
- ✅ No more silent crashes
- ✅ Clear error messages
- ✅ Easy debugging
- ✅ Production ready

---

## 🔗 Related Files

- `server/src/config/passport.ts` - Google strategy with logging
- `server/src/routes/auth.routes.ts` - Callback route with error handling
- `server/src/services/token.service.ts` - JWT signing
- `server/src/config/env.ts` - Environment variables

---

## 📞 Need More Help?

Check the error message in your logs:
1. Does it contain "JWT_ACCESS_SECRET"? → Missing env var
2. Does it contain "User"? → Database issue
3. Does it contain "Google"? → Passport strategy issue
4. Does it contain "email"? → Google profile incomplete

Search this guide for your error message - the answer is here!
