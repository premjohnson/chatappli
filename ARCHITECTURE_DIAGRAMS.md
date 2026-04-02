# Architecture Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌────────────────┐
                              │   Browser Tab  │
                              │    (React)     │
                              └────────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
            │  Auth Store    │  │   Socket.IO  │  │  Axios HTTP  │
            │  (Zustand)     │  │   Client     │  │   Client     │
            │                │  │              │  │              │
            │ • user         │  │ • singleton  │  │ • request    │
            │ • accessToken  │  │ • queue ops  │  │ • response   │
            │ • deviceId     │  │ • reconnect  │  │ • intercept  │
            └─────┬──────────┘  └──────┬───────┘  └──────┬───────┘
                  │                    │                 │
                  │                    │                 │
        ┌─────────────────────────┬───┴─────────────────┴───────────┐
        │                         │                                 │
        │  Local Storage          │  HTTP Long-Poll               │
        │  • accessToken          │  (Fallback)                   │
        │  • auth-storage         │                               │
        │                         │                               │
        │  httpOnly Cookies       │  WebSocket                    │
        │  • refreshToken         │  (Primary)                    │
        │                         │                               │
        └─────────────────────────┴───────────────┬────────────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │   Socket.IO Adapter      │
                                    │   (Redis-backed)         │
                                    │                          │
                                    │ Allows load balancing    │
                                    │ across multiple servers   │
                                    └──────────┬───────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────────┐
                                    │   Socket.IO Server       │
                                    │   (Node.js)              │
                                    │                          │
                                    │ • Auth middleware        │
                                    │ • Connection handlers    │
                                    │ • Message broadcasting   │
                                    └──────────┬───────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────────┐
                                    │   Express Backend        │
                                    │                          │
                                    │ • /auth/login            │
                                    │ • /auth/refresh          │
                                    │ • /message/*             │
                                    │ • /user/*                │
                                    └──────────┬───────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────────┐
                                    │   Database               │
                                    │   (MongoDB)              │
                                    │                          │
                                    │ • Users                  │
                                    │ • Messages               │
                                    │ • Sessions               │
                                    └──────────────────────────┘
```

---

## Connection Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    SOCKET LIFECYCLE                           │
└──────────────────────────────────────────────────────────────┘

1. INITIAL LOGIN
═══════════════════════════════════════════════════════════════

user input (email/password)
         │
         ▼
    Axios.post("/auth/login")
         │
         ├─ Success: { user, accessToken, refreshToken (cookie) }
         │
         ▼
    useAuthStore.setAuth(user, accessToken)
         │
         ▼
    Providers.tsx useEffect triggers
    (watches accessToken state)
         │
         ▼
    connectSocket(accessToken)
         │
         ├─ Create socket instance
         ├─ Set auth: { token: accessToken }
         ├─ Attach listeners (connect, disconnect, etc)
         │
         ▼
    Socket emits: "connect"
         │
         ├─ Backend validates JWT
         ├─ io.use(socketAuthMiddleware) passes
         └─ io.on("connection") handler runs
         │
         ▼
    ✓ Socket connected
      accessToken: eyJh...CURRENT (15m)
      socket.auth.token: eyJh...CURRENT (15m)


2. TOKEN REFRESH (15 minutes later)
═══════════════════════════════════════════════════════════════

User clicks button → API request
         │
         ▼
    axios.interceptors.response
         │
         ├─ Status 401 (Unauthorized)
         ├─ isRefreshing = true
         │
         ▼
    POST /auth/refresh
    (with refreshToken from httpOnly cookie)
         │
         ├─ Backend validates refresh token ✓
         ├─ Returns { accessToken: NEW }
         │
         ▼
    setAccessToken(newToken) → localStorage
         │
         ▼
    useAuthStore.updateToken(newToken)
         │
         ▼
    updateSocketAuth(newToken) ← KEY CALL
         │
         ├─ socket.auth = { token: newToken }
         ├─ socket.disconnect() → Graceful close
         ├─ socket.connect() → New connection
         │
         ▼
    Socket emits: "connect" (new attempt)
         │
         ├─ Backend validates JWT (with NEW token) ✓
         ├─ io.use(socketAuthMiddleware) passes
         └─ io.on("connection") handler runs
         │
         ▼
    ✓ Socket reconnected
      accessToken: NEW (15m)
      socket.auth.token: NEW (15m)
      
    flushOperationQueue() ← Execute queued operations
         │
         └─ emitSendMessage() → Queued during disconnect
         └─ Send with NEW token ✓


3. LOGOUT
═══════════════════════════════════════════════════════════════

user clicks logout
         │
         ▼
    disconnectSocket()
         │
         ├─ socket.removeAllListeners()
         ├─ socket.disconnect() → Send disconnect packet
         ├─ socket = null
         │
         ▼
    useAuthStore.logout()
         │
         ├─ user = null
         ├─ accessToken = null
         │
         ▼
    clearTokens()
         │
         ├─ localStorage.removeItem("accessToken")
         │
         ▼
    Navigate("/login")
         │
         ▼
    ✓ Logged out
      Socket disconnected
      Auth cleared
      Tokens removed
```

---

## Token Refresh Sequence Diagram

```
Browser                    Axios                  Backend
   │                          │                        │
   │ API request              │                        │
   ├─────────────────────────>│                        │
   │ (Authorization: Bearer   │─ POST /users ────────>│
   │  OLD_TOKEN)              │                        │
   │                          │                   401 Unauthorized
   │                          │<─ 401 ─────────────────
   │                          │                        │
   │ Intercept 401            │                        │
   │ isRefreshing = true      │                        │
   │─────────────────────────>│                        │
   │                          │─ POST /auth/refresh ─>│
   │ (with refreshToken       │   (from httpOnly)      │
   │  cookie)                 │                       │
   │                          │ Generate NEW token     │
   │                          │<─ { accessToken } ─────
   │                          │                        │
   │ saveTok(newToken)        │ (Multiple 401 queued)  │
   │ updateToken(newToken)    │                        │
   │ updateSocketAuth(newToken)                        │
   │                          │                        │
   │ Socket reconnects        │                        │
   │─────────────────────────────────────────────────>│
   │ (with NEW token)         │                        │
   │                          │ Validate ✓            │
   │                          │<──── 'connect' ────────
   │                          │                        │
   │ processQueue()           │                        │
   │ Retry original + queued  │                        │
   ├─────────────────────────>│─ POST /users ────────>│
   │ (Authorization: Bearer   │ (with NEW token)       │
   │  NEW_TOKEN)              │                       │
   │                          │                   200 OK
   │<─ 200 OK ────────────────│<─ Users data ──────────
   │                          │                        │
   │ ✓ Complete               │ ✓ Queued requests     │
   │                          │   retried             │
   │                          │                        │
```

---

## State Transitions

```
┌──────────────────────────────────────────────────────┐
│             SOCKET CONNECTION STATES                 │
└──────────────────────────────────────────────────────┘

                   ┌──────────────┐
                   │   null       │
                   │ (no socket)  │
                   └────────┬─────┘
                            │ connectSocket()
                            ▼
                   ┌──────────────┐
                   │  CONNECTING  │
                   │ isConnecting │
                   │ = true       │
                   └────────┬─────┘
                            │ JWT validated
                            ▼
                   ┌──────────────┐
                   │ CONNECTED    │
                   │ socket.      │
                   │ connected    │
                   │ = true       │
                   └────────┬─────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
         (Token Refresh)       (Logout/Error)
                 │                     │
                 ▼                     ▼
           ┌──────────┐         ┌──────────────┐
           │DISCONNECT│         │ DISCONNECTING│
           │socket.   │         │ socket.      │
           │connected │         │ disconnect() │
           │= false   │         │ called       │
           └────┬─────┘         └──────┬───────┘
                │                      │
                │updateSocketAuth()    │
                │ (reconnect)          │
                │                      ▼
                │             ┌──────────────┐
                │             │   null       │
                │             │ (cleanup)    │
                │             │ socket = null│
                │             └──────────────┘
                │
                ▼
           Back to CONNECTING
           (with new token)
```

---

## Token Storage & Refresh Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              TOKEN STORAGE & LIFECYCLE                       │
└─────────────────────────────────────────────────────────────┘

LOGIN
─────────────────────────────────────────────────────────────

Response: { accessToken, refreshToken }

Storage:
┌──────────────┐         ┌──────────────────┐
│ localStorage │         │  httpOnly Cookie │
│              │         │                  │
│ accessToken: │         │ refreshToken:    │
│  eyJhbGc..   │ ← JS    │  eyJhbGc.. ← HTTP
│  (readable)  │ readable│  (not readable)  │
│  (15m)       │ by code │  (7d)            │
└──────────────┘         └──────────────────┘

Use Case:
- accessToken → Authorization header in requests
- refreshToken → Automatic with credential requests


NORMAL REQUEST
─────────────────────────────────────────────────────────────

GET /users
Authorization: Bearer <accessToken from localStorage>
Cookie: refreshToken=... (automatic)

Response: 200 OK (token still valid)


TOKEN REFRESH
─────────────────────────────────────────────────────────────

After 15 minutes: accessToken expires

GET /users
Authorization: Bearer <OLD_accessToken>
Cookie: refreshToken=... (automatic)

Response: 401 Unauthorized

↓

POST /auth/refresh
Authorization: (none, uses refresh token from cookie)
Cookie: refreshToken=... (automatic)

Response: { accessToken: <NEW_accessToken> }

Update:
┌──────────────────────────────────────────┐
│ setAccessToken(newToken)                 │
│  → localStorage.setItem(...)             │
│                                          │
│ useAuthStore.updateToken(newToken)       │
│  → Zustand store updated                 │
│                                          │
│ updateSocketAuth(newToken)               │
│  → Socket reconnected                    │
│                                          │
│ Retry original request with NEW token ✓  │
└──────────────────────────────────────────┘


LOGOUT
─────────────────────────────────────────────────────────────

User clicks logout

Clear:
┌──────────────┐         ┌──────────────────┐
│ localStorage │         │  httpOnly Cookie │
│              │         │                  │
│ accessToken: │ CLEAR   │ refreshToken:    │
│  (removed)   │────────→│  (cleared by     │
│              │         │   server)        │
└──────────────┘         └──────────────────┘

Backend:
- /auth/logout endpoint (optional)
- Server-side session cleanup
- Optional: rotate refresh token


REFRESH TOKEN EXPIRATION
─────────────────────────────────────────────────────────────

After 7 days: refreshToken expires (in httpOnly cookie)

GET /users
Authorization: Bearer <OLD_accessToken>
Cookie: refreshToken=<EXPIRED> (automatic)

Response: 401 Unauthorized

↓

POST /auth/refresh
Authorization: (none, but refresh token expired)
Cookie: refreshToken=<EXPIRED>

Response: 401 Unauthorized (refresh token expired)

↓

AUTO LOGOUT:
- clearTokens()
- useAuthStore.logout()
- disconnectSocket()
- Redirect to /login
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│           SOCKET ERROR HANDLING FLOW                         │
└─────────────────────────────────────────────────────────────┘

SCENARIO 1: JWT Expired
───────────────────────

Socket tries to connect with OLD expired token
         │
         ▼
io.use(socketAuthMiddleware)
         │
         ▼
jwt.verify(token, secret)
         │
    ❌ TokenExpiredError
         │
         ▼
Return Error("Socket JWT expired: <time>")
         │
         ▼
Socket emits: 'connect_error'
         │
         ▼
Browser logs error
         │
    Wait for next API call...
         │
    (Axios will refresh token)
         │
    updateSocketAuth() called
         │
    Socket reconnects with NEW token ✓


SCENARIO 2: Invalid Token Signature
────────────────────────────────────

Socket sends invalid JWT
         │
         ▼
io.use(socketAuthMiddleware)
         │
         ▼
jwt.verify(token, secret)
         │
    ❌ JsonWebTokenError
         │
         ▼
Return Error("Socket auth failed: invalid JWT signature")
         │
         ▼
Socket emits: 'connect_error'
         │
         ▼
Browser logs error
         │
    Likely user needs to re-login
         │
    No automatic recovery


SCENARIO 3: Server Rejects Socket
──────────────────────────────────

Server emits: 'disconnect'
Reason: 'io server disconnect'
         │
         ▼
Socket listener logs warning
         │
    No automatic reconnection from Socket.IO
         │
    (Axios will detect next API failure)
         │
    updateSocketAuth() called
         │
    Socket reconnects


SCENARIO 4: Network Failure
───────────────────────────

Socket can't reach server
         │
         ▼
Socket emits: 'disconnect'
Reason: 'transport close'
         │
         ▼
Socket auto-reconnects (exponential backoff)
         │
    Attempt 1: 1s delay
    Attempt 2: 2s delay
    Attempt 3: 4s delay
    ... up to 30s
         │
    If token still fresh → Reconnects ✓
    If token expired → Auth middleware rejects
                   >>> Wait for next API call
                   >>> Token refresh triggered
                   >>> updateSocketAuth() called
                   >>> Reconnects with new token ✓
```

---

## Request Flow (Timeline)

```
T=00:00 Login
────────────────────────────────────────────────────────────
User logs in
  │
  ├─ setAuth(user, token) [accessToken: FRESH]
  │
  ├─ connectSocket(token)
  │  ├─ Creates socket
  │  ├─ auth: { token: FRESH }
  │  └─ Attaches listeners
  │
  └─ socket.emit('connect')
     └─ Backend validates ✓
     └─ socket.userId set ✓


T=00:01-14:59 Normal Operations
────────────────────────────────────────────────────────────
Every API/Socket call works fine
  │
  ├─ accessToken still FRESH
  ├─ socket.auth.token still FRESH
  └─ No issues


T=15:00 Token Expires
────────────────────────────────────────────────────────────
accessToken now EXPIRED
socket.auth.token now EXPIRED
  │
  ├─ But socket still connected!
  │  (It doesn't check expiry on existing connections)
  │
  ├─ HTTP API request made
  │  └─ 401 Unauthorized (token expired)
  │
  └─ Axios interceptor catches 401


T=15:00-15:02 Token Refresh
────────────────────────────────────────────────────────────
Axios triggers refresh:
  │
  ├─ POST /auth/refresh
  │  └─ Returns { accessToken: NEW }
  │
  ├─ setAccessToken(NEW) → localStorage
  │
  ├─ updateToken(NEW) → Zustand
  │
  ├─ updateSocketAuth(NEW) → Socket
  │  ├─ socket.auth = { token: NEW }
  │  ├─ socket.disconnect()
  │  └─ socket.connect()
  │
  ├─ Socket connects (new session)
  │  └─ Backend validates JWT ✓
  │  └─ socket.userId set ✓
  │
  └─ flushOperationQueue()
     └─ Execute queued ops with NEW token ✓


T=15:02-29:59 Works Again
────────────────────────────────────────────────────────────
All API/Socket calls work fine
  │
  ├─ accessToken: NEW (fresh)
  ├─ socket.auth.token: NEW (fresh)
  └─ No issues


T=30:00 Token Expires Again
────────────────────────────────────────────────────────────
Cycle repeats...
```

---

These diagrams show:
1. System architecture and components
2. Connection lifecycle from login to logout
3. Token refresh sequence
4. State transitions
5. Token storage strategy
6. Error handling paths
7. Timeline of operations

Use these to understand the complete flow visually.
