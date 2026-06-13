# Implementation Blueprint: Production-Grade Features for MyChatAppli 🛠️

This document serves as the master guide for implementing the next generation of features for the **MyChatAppli** backend. It combines architectural context, production strategies, and implementation roadmaps.

---

## 1. Backend Context & Context Sharing (For Agents/Developers)

### Architecture Overview
- **Pattern:** Clean Architecture (Controller -> Service -> Repository -> Model).
- **Transport:** REST (Express 5) + Real-time (Socket.IO 4).
- **State Management:** MongoDB (Primary) + Redis (Hot Cache/Pub-Sub).
- **Validation:** Zod schemas are used for all incoming data.
- **Errors:** Centralized `appError.js` and `error.middleware.js`.

### Key Directories
- `src/services/`: Place all core business logic here.
- `src/socket/handlers/`: Place all new WebSocket event logic here.
- `src/repositories/`: Place all direct Mongoose queries here.
- `src/config/redis.js`: Use this for all hot-state storage.

---

## 2. Production Strategies

### A. Real-Time Consistency (The "LiveBlocks" Strategy)
**Problem:** Concurrent edits in collaborative widgets.
**Strategy:**
1. **Atomic Updates:** Use Redis `WATCH`/`MULTI` or atomic operators (`HINCRBY`) for state mutations.
2. **Version Tracking:** Every state change increments a `version` number. Reject client updates if `client_version < server_version`.
3. **Write-Behind:** Update Redis instantly; debounce MongoDB writes (e.g., every 2 seconds or after 10 changes) to prevent DB saturation.

### B. Security & Privacy (The "E2EE" Strategy)
**Problem:** Protecting message content from server-side exposure.
**Strategy:**
1. **Asymmetric Key Exchange:** Use `tweetnacl` for X25519 key exchange.
2. **Key Storage:** Store Public Keys in `User` model; Private Keys **must never** leave the client.
3. **Encrypted Payloads:** The `message.content` field in MongoDB stores only the Base64 encrypted string.

### C. Scalability (The "Media Pipeline" Strategy)
**Problem:** Large image uploads blocking the Node.js event loop.
**Strategy:**
1. **Worker Threads:** Use `worker_threads` or a separate microservice for image processing (Sharp).
2. **Direct-to-S3/Cloudinary:** Utilize "Signed URLs" where the client uploads directly to storage, and the backend only handles the metadata.

---

## 3. Implementation Roadmap: "LiveBlocks" (The First Major Feature)

### Task 1: Database Schema (MongoDB)
```javascript
// models/liveblock.model.js
const liveblockSchema = new mongoose.Schema({
  conversationId: { type: ObjectId, ref: 'Conversation' },
  type: { type: String, enum: ['checklist', 'poll'] },
  state: { type: Object },
  version: { type: Number, default: 0 }
});
```

### Task 2: State Reducers (Services)
Create `src/services/liveblock.service.js` to handle logic:
```javascript
export const applyAction = async (blockId, action) => {
  const currentState = await redis.get(`liveblock:${blockId}`);
  // 1. Validate action
  // 2. Compute newState
  // 3. Save to Redis
  // 4. Queue MongoDB sync
};
```

### Task 3: Socket Integration
Update `src/socket/handlers/message.handler.js`:
- Listen for `liveblock:action`.
- Broadcast `liveblock:update` to the room.

---

## 4. Implementation Roadmap: "Message Versioning"

### Task 1: Update Message Model
```javascript
// models/message.model.js
{
  content: String,
  editHistory: [{ 
    oldContent: String, 
    editedAt: { type: Date, default: Date.now } 
  }],
  isEdited: { type: Boolean, default: false }
}
```

### Task 2: Edit Logic (Service)
1. Verify `requesterId === message.senderId`.
2. Push current `content` into `editHistory`.
3. Update `content` and set `isEdited = true`.
4. Emit `message:update` via Socket.IO to inform all participants.

---

## 5. Deployment & Monitoring Checklist
- [ ] **Redis Monitoring:** Watch memory usage for LiveBlock hot-states.
- [ ] **Socket Load:** Use `@socket.io/admin-ui` to monitor connection spikes.
- [ ] **Rate Limits:** Ensure `express-rate-limit` is tuned for the new endpoints.
- [ ] **Audit Logs:** Ensure `LiveBlock` mutations are logged in Winston for debugging.
