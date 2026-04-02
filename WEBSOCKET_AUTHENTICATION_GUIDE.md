# Production-Grade WebSocket Authentication with JWT Refresh
## Complete Implementation Guide

---

## 1. Problem Summary

**The Issue:** Socket.IO connections fail with "JWT expired" errors after access token refresh.

**Root Cause:** 
- Axios refresh interceptor updates the access token in storage
- Socket.IO client continues using the OLD expired token
- Socket reconnection attempts use that expired token
- Backend rejects socket authentication

**The Solution:** Manually trigger socket disconnection and reconnection with the new token when Axios refreshes the access token.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                            │
├─────────────────────────────────────────────────────────────┤
│ 1. User submits login credentials                           │
│ 2. Backend returns { accessToken, refreshToken }            │
│ 3. Frontend saves:                                          │
│    - accessToken → localStorage (via setAccessToken)        │
│    - refreshToken → httpOnly cookie (automatic)             │
│ 4. Auth store updated: setAuth(user, accessToken)           │
│ 5. Providers.tsx sees accessToken change                     │
│ 6. connectSocket(accessToken) called                        │
│ 7. Socket connects with auth: { token: accessToken }        │
│ 8. Backend validates JWT signature                          │
│ 9. Socket attached to user session                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                        │
├─────────────────────────────────────────────────────────────┤
│ 1. ~15 minutes later: API request fails with 401             │
│ 2. Axios response interceptor triggered                     │
│ 3. isRefreshing flag set to prevent duplicate refresh        │
│ 4. POST /auth/refresh (with refresh token in cookie)         │
│ 5. Backend returns { accessToken } (new 15m token)           │
│ 6. Axios updates:                                           │
│    - setAccessToken(newToken) → localStorage               │
│    - useAuthStore.updateToken(newToken)                    │
│ 7. updateSocketAuth(newToken) called [KEY STEP]             │
│ 8. Socket.auth = { token: newToken }                        │
│ 9. socket.disconnect() → sends disconnect packet            │
│10. socket.connect() → new connection attempt                │
│11. Backend receives new connection with new token           │
│12. JWT verification succeeds                                │
│13. Socket authenticated, operations resume                  │
│14. Queued operations processed                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LOGOUT FLOW                               │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks logout                                       │
│ 2. disconnectSocket() called                                │
│ 3. socket.removeAllListeners()                              │
│ 4. socket.disconnect() → client sends disconnect packet     │
│ 5. Backend handles socket disconnect event                  │
│ 6. useAuthStore.logout() clears auth state                 │
│ 7. Access token removed from localStorage                  │
│ 8. Redirect to /login                                       │
│ 9. Socket instance set to null                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Implementation

### Socket.IO Server Setup (socket.server.js)

```javascript
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import config from "../config/index.js";
import logger from "../config/logger.js";
import { socketAuthMiddleware } from "../middlewares/socketAuth.middleware.js";
import { registerSocketHandlers } from "./sockets.handlers.js";

let io;

export const initSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  // Redis adapter for multi-instance deployments
  const pubClient = createClient({ url: config.redis.url });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  // CRITICAL: Authentication middleware
  // Called BEFORE 'connection' event
  // Must validate JWT and attach userId to socket
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.userId;

    if (!userId) {
      logger.error(`Socket connected without userId: ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    logger.info(
      `Socket connected: ${socket.id} | User ${userId}`
    );

    // Register event handlers
    registerSocketHandlers(io, socket);
  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};
```

### Socket Authentication Middleware (socketAuth.middleware.js)

**Features:**
- Extracts token from `socket.handshake.auth.token`
- Fallback to Authorization header
- Validates JWT signature
- Sets `socket.userId` for downstream handlers
- Distinguishes between expired and invalid tokens

```javascript
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import logger from "../config/logger.js";

export const socketAuthMiddleware = (socket, next) => {
  try {
    // Extract token from socket.handshake.auth
    let token = socket.handshake.auth?.token;

    // Fallback to Authorization header
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // Token required
    if (!token) {
      logger.warn(`Socket ${socket.id} rejected: no token provided`);
      return next(new Error("Socket authentication failed: token missing"));
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    if (!decoded || !decoded.userId) {
      logger.warn(`Socket ${socket.id} rejected: invalid token payload`);
      return next(new Error("Socket authentication failed: invalid token"));
    }

    // Attach user info
    socket.userId = decoded.userId;
    socket.tokenVersion = decoded.tokenVersion;

    logger.debug(
      `Socket ${socket.id} authenticated with userId: ${decoded.userId}`
    );

    return next();
  } catch (error) {
    // Specific error messages for debugging
    if (error.name === "TokenExpiredError") {
      logger.warn(
        `Socket ${socket.id} rejected: token expired at ${new Date(
          error.expiredAt
        ).toISOString()}`
      );
      return next(new Error(`Socket JWT expired: ${error.expiredAt}`));
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn(`Socket ${socket.id} rejected: invalid JWT - ${error.message}`);
      return next(
        new Error("Socket authentication failed: invalid JWT signature")
      );
    }

    logger.error(`Socket ${socket.id} auth error:`, error.message);
    return next(new Error("Socket authentication failed"));
  }
};
```

---

## 4. Frontend Implementation

### Socket Manager (socket.ts)

**Key Concepts:**

1. **Singleton Pattern:** Only ONE socket instance exists
   - Prevents multiple WebSocket connections to same user
   - Reduces server load
   - Simplifies state management

2. **Operation Queue:** Queue operations when socket disconnected
   - Prevents data loss during reconnection
   - Ensures operations execute in order
   - Automatically flushes on reconnect

3. **Token Update Method:** `updateSocketAuth()`
   - Called by Axios refresh interceptor
   - Manually triggers disconnect/reconnect
   - Uses new token for next connection

4. **Connection State Tracking:** `isConnecting` flag
   - Prevents duplicate connection attempts
   - Prevents connecting while connecting

```typescript
// Key functions:

// Get socket (read-only)
export const getSocket = (): Socket | null => socket

// Check if connected
export const isSocketConnected = (): boolean => socket?.connected ?? false

// Initial connection
export const connectSocket = (token: string): Socket | null => {
  // Only call during login
  // Returns null if no token
  // Returns existing socket if already connected
  // Creates new socket if needed
}

// Token refresh reconnection [KEY FUNCTION]
export const updateSocketAuth = (newToken: string): Socket | null => {
  // Called by Axios interceptor
  // Updates socket.auth with new token
  // Triggers disconnect + reconnect
  // Client's next connection attempt uses new token
}

// Logout disconnection
export const disconnectSocket = () => {
  // Graceful shutdown
  // Removes all listeners
  // Clears socket instance
}

// Operation management
export const emitSendMessage = (payload) => {
  // Emits if connected
  // Queues if disconnected
}
```

### Axios Interceptor Integration (axios.ts)

**Response Interceptor Flow:**

```
API Request fails with 401
        ↓
Is it /auth/refresh endpoint?
  ├─ YES → Clear tokens, logout, redirect to /login
  └─ NO → Continue to retry logic
        ↓
Is refresh already in progress?
  ├─ YES → Queue this request, wait for refresh
  └─ NO → Mark as refreshing, make refresh request
        ↓
POST /auth/refresh (with refresh token cookie)
        ↓
Success? Get newAccessToken
  ├─ YES → Continue below
  └─ NO → Logout, redirect to /login
        ↓
setAccessToken(newAccessToken) ← Storage
useAuthStore.updateToken(newAccessToken) ← Zustand
updateSocketAuth(newAccessToken) ← Socket [KEY STEP]
        ↓
processQueue(null, newAccessToken) ← Retry queued requests
        ↓
Retry original request with new token
```

```typescript
api.interceptors.response.use(
  // Success - pass through
  (response) => response,

  // Error - handle 401
  async (error) => {
    const originalRequest = error.config as CustomRequestConfig

    // Stop if refresh endpoint failed
    if (originalRequest.url?.includes("/auth/refresh")) {
      clearTokens()
      useAuthStore.getState().logout()
      
      try {
        const { disconnectSocket } = await import("./socket")
        disconnectSocket()
      } catch (err) {
        console.error("[Axios] Error disconnecting socket:", err)
      }

      window.location.href = "/login"
      return Promise.reject(error)
    }

    // Retry logic for 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Queue if refresh in progress
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      // Start refresh
      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = res.data.accessToken

        // Update everywhere
        setAccessToken(newAccessToken)
        useAuthStore.getState().updateToken(newAccessToken)

        // KEY STEP: Update socket with new token
        try {
          const { updateSocketAuth } = await import("./socket")
          updateSocketAuth(newAccessToken)
        } catch (err) {
          console.error("[Axios] Error updating socket:", err)
          // Continue - socket will reconnect on its own
        }

        // Process queued requests
        processQueue(null, newAccessToken)

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (err) {
        // Refresh failed
        processQueue(err, null)
        clearTokens()
        useAuthStore.getState().logout()

        try {
          const { disconnectSocket } = await import("./socket")
          disconnectSocket()
        } catch (importErr) {
          console.error("[Axios] Error disconnecting socket:", importErr)
        }

        window.location.href = "/login"
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
```

### Zustand Auth Store (auth.store.ts)

**Two separate actions:**

| Action | When Used | Purpose |
|--------|-----------|---------|
| `setAuth(user, token)` | Initial login | Set user + token together |
| `updateToken(token)` | Token refresh | Update only token, keep user |

```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  // ... other fields ...

  setAuth: (user: User, token: string) => void
  updateToken: (token: string) => void // NEW
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ... state ...

      setAuth: (user, token) => {
        console.log("[AuthStore] Setting auth")
        set({ user, accessToken: token })
      },

      updateToken: (token: string) => {
        console.log("[AuthStore] Updating token (from refresh)")
        set({ accessToken: token })
      },

      logout: () => {
        console.log("[AuthStore] Logging out")
        set({
          user: null,
          accessToken: null,
          // ... reset other fields ...
        })
      },
    }),
    { name: "auth-storage" }
  )
)
```

### Providers Setup (Already Integrated)

```typescript
function SocketProvider({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return

    // Initial connection on login
    connectSocket(accessToken)

    return () => {
      // Cleanup on logout (accessToken becomes null)
      disconnectSocket()
    }
  }, [accessToken]) // Dependency: when token changes

  return <>{children}</>
}
```

---

## 5. Login Flow Integration

**In your login component:**

```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password })

    const { user, accessToken } = response.data

    // THIS TRIGGERS SOCKET CONNECTION
    // Because providers watch accessToken
    useAuthStore.getState().setAuth(user, accessToken)

    // Socket connects automatically in Providers.tsx useEffect
    // No need to call connectSocket here
  } catch (error) {
    console.error("Login failed:", error)
  }
}
```

---

## 6. Error Handling & Edge Cases

### Case 1: Token Expired During Socket Operation

```
User sends message at t=14:59
Access token expires at t=15:00
Message arrives to backend at t=15:01
Backend rejects with 401 (token expired)

Solution:
- Axios catches 401
- Refreshes token
- Calls updateSocketAuth()
- Socket reconnects with new token
- Operation is NOT automatically retried (socket events, unlike HTTP)
- User sees "sending..." for a moment, then completes
```

### Case 2: Network Disconnection During Token Refresh

```
Socket disconnects
At same time, access token expires
User comes back online

Solution:
- Socket attempts to reconnect with old token
- Gets auth error
- connectionError event fires
- Can trigger manual disconnect + reconnect
- Or wait for next Axios API call to trigger refresh

Best: Add periodic token refresh check (background task)
```

### Case 3: Multiple Tabs/Windows

```
Tab 1: Token refreshes → updateSocketAuth()
Tab 2: Token refreshes → updateSocketAuth()
Both tabs connect socket

Problem: Same user, multiple socket connections
Solution 1: Use Redis adapter (already configured)
           Server allows multiple connections
           Both tabs are active, which is correct

Solution 2: If only one should be active
           Use localStorage write event to coordinate
```

### Case 4: Refresh Token Expired

```
POST /auth/refresh fails (refresh token invalid)

Solution:
- Axios catches error in response interceptor
- Clears both tokens
- Calls disconnectSocket()
- Redirects to /login
- User must login again
```

---

## 7. Production Checklist

### Backend
- [ ] Environment variables set:
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `JWT_ACCESS_EXPIRES` (e.g., "15m")
  - `JWT_REFRESH_EXPIRES` (e.g., "7d")
  - `REDIS_URL` (for Socket.IO adapter)

- [ ] Redis running (for production scaling)

- [ ] Logging configured (see enhanced middleware)

- [ ] CORS configured correctly in socket.server.js

- [ ] Rate limiting middleware on auth routes

### Frontend
- [ ] Environment variables set:
  - `VITE_API_URL`
  - `VITE_SOCKET_URL`

- [ ] Token storage is secure:
  - Access token: localStorage (can be read by JS)
  - Refresh token: httpOnly cookie (safe)

- [ ] Logout flow tested:
  - Socket disconnects
  - Tokens cleared
  - User redirected to login

- [ ] Token refresh tested:
  - Wait 15+ minutes after login
  - Trigger API call
  - Verify socket reconnects

- [ ] Error handling tested:
  - Network disconnect during socket operation
  - Token refresh during socket operation
  - Refresh token expiration

### Monitoring
- [ ] Log socket connect/disconnect events
- [ ] Monitor token refresh frequency
- [ ] Alert on high 401 error rates
- [ ] Monitor socket.io adapter (Redis)

---

## 8. Performance Considerations

### Exponential Backoff (Already in Socket Config)

```typescript
reconnectionDelay: 1000,        // Start: 1s
reconnectionDelayMax: 30000,    // Max: 30s
randomizationFactor: 0.5,       // Jitter to prevent thundering herd

// Socket.IO automatically calculates:
// Attempt 1: ~1s
// Attempt 2: ~2s
// Attempt 3: ~4s
// Attempt 4: ~8s
// ... up to 30s max
```

### Operation Queue Management

```typescript
// Queue is reset on:
// 1. Successful connection
// 2. Graceful disconnect (logout)
// 3. Server explicitly disconnects (server_disconnect)

// Queue grows if socket offline for extended period
// Consider implementing max queue size in production:

if (operationQueue.length > 1000) {
  console.warn("Operation queue full, dropping oldest")
  operationQueue.shift()
}
```

### Scaling to Thousands of Users

```
With Redis Adapter:
- All socket.io servers share same Redis connection
- User connects to any server (via load balancer)
- If server dies, socket reconnects to another server
- Message broadcast works across all servers
- Presence tracking works across all servers

Without Redis Adapter (single server):
- All connections must go to same server
- No failover capability
- Good for development only
```

---

## 9. Testing Strategy

### Unit Tests (Backend)

```javascript
describe("Socket Authentication", () => {
  it("should reject socket without token", (done) => {
    // Create socket without auth
    // Expect 'connect_error' event
    // Error message includes "token missing"
  })

  it("should reject socket with expired token", (done) => {
    // Create socket with expired JWT
    // Expect 'connect_error' event
    // Error message includes "expired"
  })

  it("should accept socket with valid token", (done) => {
    // Create socket with valid JWT
    // Expect socket.userId to be set
    // Expect 'connection' event
  })
})
```

### Integration Tests (Frontend)

```typescript
describe("Socket Reconnection on Token Refresh", () => {
  it("should reconnect socket when token refreshed", async () => {
    // 1. Connect socket with initial token
    // 2. Verify connected
    // 3. Call updateSocketAuth(newToken)
    // 4. Verify disconnect fired
    // 5. Verify reconnect fired
    // 6. Verify socket.auth.token === newToken
  })

  it("should queue operations during reconnection", async () => {
    // 1. Connect socket
    // 2. Verify connected
    // 3. Call updateSocketAuth(newToken)
    // 4. Immediately emit message (while disconnecting)
    // 5. Verify operation queued
    // 6. Verify socket reconnects
    // 7. Verify operation executed
  })

  it("should process queued operations in order", async () => {
    // 1. Simulate disconnection
    // 2. Emit 3 messages
    // 3. Verify all 3 queued
    // 4. Reconnect
    // 5. Verify executed in order
  })
})
```

### Manual Testing

```
1. Login
   - Verify socket connects with initial token
   - Check browser DevTools Network tab for socket connection

2. Wait for token refresh
   - Open browser console
   - Watch for "[Socket] Token refreshed, reconnecting socket..."
   - Watch for "Socket reconnection initiated with new token"
   - Socket should disconnect and reconnect

3. Send message after refresh
   - Verify message appears on recipient
   - Check socket logs for message emission

4. Logout
   - Verify socket disconnects
   - Verify redirected to /login
   - Check tokens cleared from localStorage

5. Refresh Token Expiration
   - Delete refresh token cookie (DevTools)
   - Trigger API call
   - Verify redirected to /login
   - Verify socket disconnected
```

---

## 10. Troubleshooting Common Issues

### Issue: "Socket JWT expired" after token refresh

**Diagnosis:**
- Token IS refreshed (check localStorage)
- Socket STILL has old token

**Solution:**
- Verify `updateSocketAuth()` called in axios interceptor
- Add console logs to see if function executes
- Verify socket.auth.token is updated

**Code to Add:**
```typescript
export const updateSocketAuth = (newToken: string) => {
  console.log("[Socket] Current token:", socket?.auth?.token?.substring(0, 20))
  console.log("[Socket] New token:", newToken.substring(0, 20))
  
  socket.auth = { token: newToken }
  
  console.log("[Socket] Updated token:", socket.auth.token.substring(0, 20))
  socket.disconnect()
  socket.connect()
}
```

### Issue: Multiple socket instances (one per tab)

**Diagnosis:**
- Check `getSocket()` returns different instances in different tabs
- Check socket IDs in logs are different

**Solution:**
- This is NORMAL for multiple browser tabs
- Each tab has own socket instance
- Server sees multiple connections per user
- Redis adapter handles this correctly

**Note:** If you want only ONE socket across tabs:
```typescript
// In localStorage event listener
window.addEventListener("storage", (e) => {
  if (e.key === "auth-storage") {
    // Another tab updated auth
    // Could disconnect secondary tabs
  }
})
```

### Issue: Socket keeps reconnecting, never stays connected

**Diagnosis:**
- Check browser console for "connect_error"
- Check server logs for socket auth errors

**Solution:**
1. Verify JWT secret matches frontend and backend
2. Verify token hasn't expired (check JWT.io)
3. Verify socket.io versions match frontend/backend
4. Verify Redis running (if using adapter)

**Code to Debug:**
```javascript
// Backend - add detailed logging
const decoded = jwt.verify(token, config.jwt.accessSecret)
console.log("Token verify error:", error)
console.log("Token claims:", decoded)
console.log("Expected userId:", decoded?.userId)
```

### Issue: Operations lost after disconnect

**Diagnosis:**
- Send message while socket disconnected
- Message doesn't arrive after reconnect

**Solution:**
- Verify `queueOperation()` is called
- Verify operation NOT executed on disconnect
- Verify `flushOperationQueue()` called on reconnect
- Check browser DevTools for errors

**Debug Code:**
```typescript
const emitSendMessage = (payload) => {
  console.log("[Socket] Current state:", {
    connected: socket?.connected,
    queueLength: operationQueue.length,
  })

  const operation = () => {
    console.log("[Socket] Executing queued operation")
    socket.emit(MESSAGE_EVENTS.SEND, payload)
  }

  if (socket?.connected) {
    console.log("[Socket] Socket connected, emitting immediately")
    operation()
  } else {
    console.log("[Socket] Socket not connected, queuing")
    queueOperation(operation)
  }
}
```

---

## 11. Summary Table

| Component | Location | Purpose |
|-----------|----------|---------|
| `socketAuthMiddleware` | `backend/middlewares/socketAuth.middleware.js` | Validate JWT on socket connection |
| `socket.server.js` | `backend/socket/socket.server.js` | Initialize Socket.IO with Redis adapter |
| `socket.ts` | `frontend/lib/socket.ts` | Singleton socket instance & lifecycle |
| `updateSocketAuth()` | `frontend/lib/socket.ts` | KEY: Reconnect socket with new token |
| `axios.ts` interceptor | `frontend/lib/axios.ts` | Call `updateSocketAuth()` after token refresh |
| `auth.store.ts` | `frontend/store/auth.store.ts` | Zustand state: user, tokens |
| `providers.tsx` | `frontend/app/providers.tsx` | Connect socket when accessToken changes |

---

## 12. Key Takeaways

1. **Socket authentication is ONE-TIME** (at connection init)
   - Must disconnect and reconnect to use new token
   - Unlike HTTP, which can add header to each request

2. **Queue operations during disconnect**
   - Prevents data loss
   - Flush on reconnect

3. **Axios refresh triggers socket reconnect**
   - This is the KEY integration point
   - Without it, socket keeps using old token

4. **Three places tokens are updated:**
   - localStorage (via `setAccessToken`)
   - Zustand store (via `updateToken`)
   - Socket auth (via `updateSocketAuth`)

5. **Logout must disconnect socket BEFORE clearing tokens**
   - Prevents "ghost" connections

6. **Redis adapter required for multi-instance production deployment**
   - Allows load balancing
   - Allows graceful shutdown

---

This is a production-grade solution. Implement it systematically, test thoroughly, and monitor in production.
