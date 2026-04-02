# WebSocket JWT Authentication - Quick Start Guide

## The Problem in 30 Seconds

When your access token expires (every 15 minutes):
1. ✅ HTTP APIs refresh token automatically
2. ❌ WebSocket still uses the OLD expired token
3. ❌ Socket gets rejected with "JWT expired"

## The Solution in 30 Seconds

When Axios refreshes the token:
1. ✅ Save new token to storage
2. ✅ **Reconnect socket with new token** ← This was missing!
3. ✅ Done

## What Changed (5 Critical Changes)

### 1. Socket Manager (socket.ts)

**New Function:** `updateSocketAuth(newToken)`

```typescript
// Before: Socket kept using old token ❌
connectSocket(newToken)  // Creates NEW instance

// After: Update existing socket ✓
updateSocketAuth(newToken)  // Reconnect with new token
```

### 2. Axios Interceptor (axios.ts)

**What calls the socket update:**

```typescript
// Before: Wrong function
import('./socket').then(({ connectSocket }) => {
  connectSocket(newAccessToken)  // ❌ Creates new socket
})

// After: Right function
import('./socket').then(({ updateSocketAuth }) => {
  updateSocketAuth(newAccessToken)  // ✓ Reconnect existing
})
```

### 3. Auth Store (auth.store.ts)

**New action:**

```typescript
// New updateToken action
useAuthStore.getState().updateToken(newToken)
```

### 4. Better Error Messages

**Backend logging is now detailed:**

```
❌ Before: "Socket JWT verification failed: jwt malformed"
✓ After: "Socket 123abc rejected: token expired at 2024-01-01T15:30:00Z"
```

### 5. Operation Queue

**Messages sent while disconnecting are now queued:**

```typescript
// Before: Message lost ❌
socket.emit(MESSAGE_EVENTS.SEND, payload)  // socket null → lost

// After: Message queued and sent ✓ 
emitSendMessage(payload)  // Queued, sent after reconnect
```

---

## Files Already Updated

✅ These files have been modified:

```
backend/
  └─ src/middlewares/
     └─ socketAuth.middleware.js ← Better error messages

frontend/
  └─ src/
     ├─ lib/
     │  └─ socket.ts ← Complete rewrite (updateSocketAuth added)
     │  └─ axios.ts ← Calls updateSocketAuth after refresh
     ├─ store/
     │  └─ auth.store.ts ← Added updateToken method
```

---

## Testing (2 Minutes)

### Test 1: Does socket connect on login?

```bash
1. Open app
2. Login
3. Open DevTools Console
4. Run: const s = await import('./lib/socket').then(m => m.getSocket()); s?.connected
5. Should see: true
```

### Test 2: Does socket reconnect when token refreshes?

```bash
1. Login
2. Wait 15+ minutes (or set JWT_ACCESS_EXPIRES=1m)
3. Click any button that calls API
4. Open DevTools Console
5. Look for: "[Socket] Token refreshed, reconnecting socket..."
6. Socket should disconnect, then reconnect
```

### Test 3: Can you send messages?

```bash
1. Complete Test 2
2. Send a message in chat
3. It should arrive on recipient
4. No errors in console
```

---

## Deployment Checklist (5 Minutes)

- [ ] All 4 files above are updated
- [ ] Tests 1-3 pass on your machine
- [ ] Environment variables set:
  - Backend: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - Frontend: `VITE_API_URL`, `VITE_SOCKET_URL`
  - Redis running on backend
- [ ] No console errors when you test
- [ ] Logout properly disconnects socket

---

## Common Gotchas

### ❌ Gotcha 1: Still Seeing "JWT Expired"

**Check:**
```typescript
// axios.ts line 120-something should have:
const { updateSocketAuth } = await import("./socket")
updateSocketAuth(newAccessToken)

// NOT:
const { connectSocket } = await import("./socket")
connectSocket(newAccessToken)
```

### ❌ Gotcha 2: Socket Creates Multiple Instances

**Check:**
```typescript
// socket.ts should have:
if (socket) return socket  // Return existing
socket = io(...)           // Create only if null

// NOT:
socket = io(...)  // Always create new
```

### ❌ Gotcha 3: Messages Lost During Disconnect

**Check:**
```typescript
// socket.ts emitSendMessage should queue:
if (socket?.connected) {
  operation()
} else {
  queueOperation(operation)  // Queue for later
}

// NOT:
socket.emit(...)  // Send immediately (fails if offline)
```

---

## Monitoring (What to Watch)

### Logs to Check

```bash
# Backend (watch for these logs)
Socket connected: <socket-id> | User <user-id>
Socket <socket-id> authenticated
Socket <socket-id> rejected: token expired

# Frontend (DevTools console, watch for these)
[Socket] Connected: <socket-id>
[Socket] Token refreshed, reconnecting
[Socket] Reconnection initiated with new token
```

### Metrics to Track

```
✓ Socket connects on login (should be 1 connection)
✓ Socket reconnects when token refreshes (every 15 min)
✓ No "JWT expired" errors (should be 0)
✓ Messages send successfully after refresh
```

---

## Architecture in 3 Steps

```
STEP 1: User logs in
        └─ Socket connects with initial token

STEP 2: Token expires (15 minutes later)
        └─ Axios detects 401 on API call
        └─ Axios gets new token from refresh endpoint
        └─ Axios calls: updateSocketAuth(newToken)

STEP 3: Socket reconnects with new token
        └─ Backend validates new token ✓
        └─ Socket stays connected
        └─ Operations queued during refresh execute
        └─ No more "JWT expired" errors
```

---

## Troubleshooting (30 Seconds Each)

| Problem | Check | Fix |
|---------|-------|-----|
| "JWT expired" still appears | `updateSocketAuth()` being called? | Add logs to axios.ts |
| Socket won't connect | Token not expired? | Wait 15+ min or change JWT_ACCESS_EXPIRES |
| Multiple socket connections | Check `if (socket)` guard | Verify socket.ts has return check |
| Messages not sending | `emitSendMessage()` queuing? | Check socket status before send |
| Errors when logging out | `disconnectSocket()` called first? | Call before clearing auth store |

---

## Questions? Read These Files in Order

1. **Quick understanding:** `BEFORE_AFTER_COMPARISON.md`
2. **Implementation details:** `WEBSOCKET_AUTHENTICATION_GUIDE.md`
3. **Testing & verification:** `IMPLEMENTATION_CHECKLIST.md`

---

## Success Indicator

Your implementation is working when:

```
✅ Login → Socket connects
✅ Wait 15 minutes → Token refreshes silently
✅ Send message → Works perfectly
✅ No "JWT expired" errors
✅ Logout → Socket properly disconnects
```

Done! 🎉
