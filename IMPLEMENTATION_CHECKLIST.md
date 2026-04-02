# WebSocket JWT Authentication - Implementation Checklist

## Files Already Updated ✓

These files have been modified with production-grade implementations:

- [x] **backend/src/middlewares/socketAuth.middleware.js**
  - Enhanced JWT validation with better error messages
  - Distinguishes between expired and invalid tokens
  - Logs socket ID for debugging

- [x] **frontend/src/lib/socket.ts**
  - Complete rewrite with singleton pattern
  - Added `updateSocketAuth()` for token refresh
  - Operation queue system to prevent data loss
  - Comprehensive connection & error handling
  - Connection state tracking (`isConnecting`, `isSocketConnected`)

- [x] **frontend/src/store/auth.store.ts**
  - Added `updateToken()` action for token refresh
  - Kept `setAuth()` for initial login
  - Added logging for debugging

- [x] **frontend/src/lib/axios.ts**
  - Enhanced response interceptor with logging
  - Calls `updateSocketAuth()` after successful refresh
  - Better error handling for refresh endpoint failures
  - Properly handles token refresh queue

## Files Requiring Review/Action

### 1. Login Component (Optional Enhancement)

**Location:** `frontend/src/features/auth/pages/LoginPage.tsx` (or similar)

**Current State:** Likely calls API, then sets auth

**Recommended Addition:** Verify `setAuth()` is called correctly

```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password })
    const { user, accessToken } = response.data

    // This triggers socket connection automatically
    useAuthStore.getState().setAuth(user, accessToken)
    // Socket connects in Providers.tsx useEffect
    // DO NOT manually call connectSocket() here
  } catch (error) {
    // Handle error
  }
}
```

**Action:** ✓ Review (should already be working)

---

### 2. Token Refresh Endpoint (Backend)

**Location:** `backend/src/controllers/auth.controller.js` (or router)

**What to Check:**
- [ ] GET `/auth/refresh` endpoint exists
- [ ] Validates refresh token from httpOnly cookie
- [ ] Returns new accessToken in response
- [ ] Refresh token rotation (optional, advanced)

**Example Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

**Action:** ⚠️ Review to ensure working correctly

---

### 3. Environment Variables

**Backend (.env or config):**
```bash
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-other-secret-key-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
REDIS_URL=redis://localhost:6379
```

**Frontend (.env.local):**
```bash
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5013
```

**Action:** ✓ Verify all set correctly

---

### 4. Socket Handler Registration

**Location:** `backend/src/socket/sockets.handlers.js`

**Current State:** Likely handles messages, typing, etc.

**Recommended Addition:** No changes needed - auth middleware runs before handlers

**Action:** ✓ No action required

---

## Testing Checklist

### Manual Testing

#### Test 1: Initial Connection
```
STEPS:
1. Open app in fresh browser tab
2. Login with valid credentials
3. Wait 2 seconds
4. Open browser DevTools → Console
5. Run: const socket = await import('./lib/socket').then(m => m.getSocket()); socket?.connected
EXPECTED: true
```

#### Test 2: Token Refresh
```
STEPS:
1. Complete Test 1
2. Open browser DevTools → Network
3. Wait 15+ minutes (or set JWT_ACCESS_EXPIRES=1m for testing)
4. Click any button/link that triggers API call
5. Watch Network tab for POST /auth/refresh
6. Open Console tab
7. Look for "[Socket] Token refreshed, reconnecting socket..." message
EXPECTED: Message appears, socket disconnects and reconnects
```

#### Test 3: Message After Refresh
```
STEPS:
1. Complete Test 2
2. Send a message in chat
3. Verify message appears on recipient
4. Check console for "[Socket] Sending message:" log
EXPECTED: Message sent successfully with new token
```

#### Test 4: Logout
```
STEPS:
1. Complete Test 1
2. Click logout button
3. Open Console tab
4. Look for "[Socket] Disconnecting socket gracefully..." message
5. Verify redirected to /login
6. Open DevTools → Application → LocalStorage
7. Look for 'accessToken' key
EXPECTED: Socket disconnected, redirected to login, token cleared
```

#### Test 5: Expired Refresh Token
```
STEPS:
1. Complete Test 1
2. Open DevTools → Application → Cookies
3. Delete the refresh token cookie (usually named 'refreshToken')
4. Wait for token to expire (15+ minutes, or set JWT_ACCESS_EXPIRES=1m)
5. Click any API call button
6. Watch Network tab for POST /auth/refresh
EXPECTED: Request fails, redirected to login, socket disconnected
```

### Automated Testing

```typescript
// Example Jest test
describe("Socket Authentication with Token Refresh", () => {
  it("should reconnect socket with new token after refresh", async () => {
    // 1. Connect socket with token A
    const socket = connectSocket(tokenA)
    await new Promise((resolve) => {
      socket?.once("connect", resolve)
    })
    expect(socket?.connected).toBe(true)

    // 2. Simulate token refresh
    await updateSocketAuth(tokenB)

    // 3. Wait for reconnection
    await new Promise((resolve) => {
      socket?.once("connect", resolve)
    })

    // 4. Verify using new token
    expect(socket?.auth?.token).toBe(tokenB)
  })
})
```

---

## Monitoring Checklist

### Server Logs to Monitor

```bash
# Watch for socket auth failures
tail -f app.log | grep "Socket.*authentication failed"

# Watch for successful connections
tail -f app.log | grep "Socket connected:"

# Watch for token refresh
tail -f app.log | grep "accessing /auth/refresh"
```

### Metrics to Track

- [ ] Socket connects/disconnects per user per day
- [ ] Token refresh frequency (should be ~every 15 minutes)
- [ ] Socket auth failure rate (should be ~0%)
- [ ] Average time from token refresh to socket reconnection
- [ ] Operation queue peak size (should be small)

### Alerts to Set Up

```
Alert if:
- Socket auth failure rate > 1% (possible token issue)
- Average reconnection time > 5 seconds (network issue)
- Token refresh hitting > 100/minute (unusual)
- Operation queue size > 100 (socket offline too long)
```

---

## Rollout Plan

### Phase 1: Development (Now)
- [ ] Review all changes above
- [ ] Run Test 1-4 on local machine
- [ ] Fix any issues

### Phase 2: Staging
- [ ] Deploy changes to staging env
- [ ] Run full test suite
- [ ] Load test with multiple users
- [ ] Monitor logs for 24 hours
- [ ] Fix any issues

### Phase 3: Production
- [ ] Deploy during low-traffic window
- [ ] Monitor logs closely for first hour
- [ ] Watch error rates for first day
- [ ] Gradually increase traffic

---

## Rollback Plan

If something goes wrong in production:

```bash
# Option 1: Revert to previous code
git revert <commit-hash>
git push origin main

# Option 2: Keep code, disable socket for critical time
# (Add feature flag to disable socket globally)

# Option 3: Monitor closely, don't rollback if working
# (Usually issues are configuration, not code)
```

---

## Common Issues & Fixes

### Issue: "Socket JWT expired" still appearing

**Debug Steps:**
1. Check `updateSocketAuth()` is being called
   ```typescript
   // Add to axios.ts after setAccessToken
   console.log("[Axios] About to update socket auth with token:", newToken.substring(0, 20))
   ```

2. Verify socket.auth is updated
   ```typescript
   // Add to socket.ts before disconnect
   console.log("[Socket] Socket auth:", socket?.auth)
   ```

3. Check JWT secret matches
   ```bash
   # Backend
   echo $JWT_ACCESS_SECRET
   # Should be same value used in tests
   ```

**Most Common Cause:** JWT_ACCESS_SECRET different on frontend vs backend

---

### Issue: Socket keeps disconnecting and reconnecting

**Debug Steps:**
1. Check browser console for "connect_error"
2. Check server console for socket auth errors
3. Verify JWT not expired: `jwt.io/<token>`
4. Verify Socket.IO version matches (both ~4.5.0+)

**Most Common Cause:** Mismatched Socket.IO versions

---

### Issue: Operations like messages not being sent

**Debug Steps:**
1. Check if `emitSendMessage()` is being called
2. Check if socket is connected before send
   ```typescript
   console.log("Socket connected:", socket?.connected)
   console.log("Socket ID:", socket?.id)
   ```
3. Check browser console for errors
4. Check server logs for received message event

**Most Common Cause:** Socket.connected is false, so operation queued

---

## Success Criteria

✓ Your implementation is working when:

1. Users can login and socket connects
2. After 15 minutes, API calls trigger token refresh
3. Socket automatically reconnects with new token
4. Users can send messages throughout the session
5. Logout properly disconnects socket
6. No "JWT expired" errors in console
7. No duplicate socket connections per user
8. Operations queued during disconnect are executed after reconnect

---

## Quick Reference

| Action | Function | Location |
|--------|----------|----------|
| Get current socket | `getSocket()` | `socket.ts` |
| Check if connected | `isSocketConnected()` | `socket.ts` |
| Initial login connect | `connectSocket(token)` | `socket.ts` |
| Token refresh reconnect | `updateSocketAuth(newToken)` | `socket.ts` |
| Logout disconnect | `disconnectSocket()` | `socket.ts` |
| Update token in store | `useAuthStore.getState().updateToken(token)` | `auth.store.ts` |
| Send message | `emitSendMessage(payload)` | `socket.ts` |

---

## Next Steps

1. **Review** all changes in modified files
2. **Test** using the Manual Testing Checklist above
3. **Monitor** logs during testing
4. **Fix** any issues found
5. **Deploy** to staging environment
6. **Load test** with multiple concurrent users
7. **Deploy** to production during low-traffic window
8. **Monitor** for 24 hours after deployment

Questions? Check `WEBSOCKET_AUTHENTICATION_GUIDE.md` for detailed explanations.
