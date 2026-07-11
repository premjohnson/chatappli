import http from "http";
import request from "supertest";
import { io as Client } from "socket.io-client";
import mongoose from "mongoose";
import app from "../src/app.js";
import connectDB, { closeDB } from "../src/config/database.js";
import { connectRedis, getRedisClient, disconnectRedis } from "../src/config/redis.js";
import { initSocket, closeSocket } from "../src/socket/socket.server.js";
import { startLiveBlockWorker, liveblockQueue } from "../src/config/queue.js";
import User from "../src/models/user.model.js";
import Conversation from "../src/models/conversation.model.js";
import LiveBlock from "../src/models/liveblock.model.js";
import { generateAccessToken } from "../src/utils/token.util.js";

describe("LiveBlock Integration Tests", () => {
  let testServer;
  let socketUrl;
  let worker;
  let user;
  let otherUser;
  let token;
  let conversation;

  beforeAll(async () => {
    // 1. Setup DB and Redis
    await connectDB();
    await connectRedis();

    // 2. Start HTTP Server and Bind Sockets
    testServer = http.createServer(app);
    await initSocket(testServer);
    worker = startLiveBlockWorker();

    await new Promise((resolve) => {
      testServer.listen(0, () => {
        const port = testServer.address().port;
        socketUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Create test users
    await User.deleteMany({ username: { $in: ["testuser1", "testuser2"] } });
    const uniqueEmail1 = `test_${Date.now()}_1@example.com`;
    const uniqueEmail2 = `test_${Date.now()}_2@example.com`;

    user = await User.create({
      email: uniqueEmail1,
      password: "Password123!",
      username: "testuser1",
      tokenVersion: 1,
      isActive: true,
    });

    otherUser = await User.create({
      email: uniqueEmail2,
      password: "Password123!",
      username: "testuser2",
      tokenVersion: 1,
      isActive: true,
    });

    // 4. Generate auth token for user 1
    token = generateAccessToken(user);

    // 5. Create a conversation room with these two users
    conversation = await Conversation.create({
      type: "private",
      participants: [
        { user: user._id },
        { user: otherUser._id },
      ],
    });
  });

  afterAll(async () => {
    // 1. Clean up database
    if (user) await User.deleteOne({ _id: user._id });
    if (otherUser) await User.deleteOne({ _id: otherUser._id });
    if (conversation) {
      await Conversation.deleteOne({ _id: conversation._id });
      await LiveBlock.deleteMany({ conversationId: conversation._id });
    }

    // 2. Disconnect and allow disconnect handlers to finish before closing redis
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. Tear down services and connections
    if (worker) await worker.close();
    await liveblockQueue.close();
    await closeSocket();
    await disconnectRedis();
    await closeDB();
    if (testServer) {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  describe("REST API Endpoints", () => {
    let createdBlockId;

    it("should create a LiveBlock checklist via POST /api/v1/liveblocks", async () => {
      const res = await request(app)
        .post("/api/v1/liveblocks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          conversationId: conversation._id.toString(),
          type: "checklist",
          state: { items: [] },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.type).toBe("checklist");
      expect(res.body.data.version).toBe(0);

      createdBlockId = res.body.data.id;
    });

    it("should retrieve the created LiveBlock via GET /api/v1/liveblocks/:blockId", async () => {
      const res = await request(app)
        .get(`/api/v1/liveblocks/${createdBlockId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.id).toBe(createdBlockId);
      expect(res.body.data.version).toBe(0);
    });

    it("should return 403 when user is not a participant of the conversation", async () => {
      // Create a random user who is not in the conversation
      const outsider = await User.create({
        email: `outsider_${Date.now()}@example.com`,
        password: "Password123!",
        username: "outsider",
        tokenVersion: 1,
        isActive: true,
      });
      const outsiderToken = generateAccessToken(outsider);

      const res = await request(app)
        .get(`/api/v1/liveblocks/${createdBlockId}`)
        .set("Authorization", `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe("fail");

      // Cleanup outsider
      await User.deleteOne({ _id: outsider._id });
    });
  });

  describe("WebSocket Event Integrations", () => {
    let clientSocket;
    let block;

    beforeEach(async () => {
      // Clear Redis socket rate limiting key for test isolation
      const redis = getRedisClient();
      await redis.del(`socket:rate:${user._id.toString()}`);

      // Create a fresh block for each websocket test
      block = await request(app)
        .post("/api/v1/liveblocks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          conversationId: conversation._id.toString(),
          type: "checklist",
          state: { items: [] },
        })
        .then((res) => res.body.data);

      // Connect client socket
      clientSocket = Client(socketUrl, {
        auth: { token },
      });

      await new Promise((resolve) => {
        clientSocket.on("ready", resolve);
      });
    });

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    it("should successfully apply ADD_ITEM and broadcast update", async () => {
      const promise = new Promise((resolve) => {
        clientSocket.on("liveblock:update", (update) => {
          expect(update.blockId).toBe(block.id);
          expect(update.version).toBe(1);
          expect(update.state.items.length).toBe(1);
          expect(update.state.items[0].text).toBe("Buy groceries");
          resolve();
        });
      });

      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 0,
        action: {
          type: "ADD_ITEM",
          payload: { text: "Buy groceries" },
        },
      });

      await promise;
    });

    it("should reject action when clientVersion is outdated (concurrency conflict)", async () => {
      // 1. Send first action to increment version from 0 to 1
      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 0,
        action: {
          type: "ADD_ITEM",
          payload: { text: "First item" },
        },
      });

      await new Promise((resolve) => clientSocket.once("liveblock:update", resolve));

      // 2. Submit second action with outdated version 0 (current is 1)
      const promise = new Promise((resolve) => {
        clientSocket.on("error", (error) => {
          expect(error.errorCode).toBe("CONCURRENCY_CONFLICT");
          resolve();
        });
      });

      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 0,
        action: {
          type: "ADD_ITEM",
          payload: { text: "Outdated write" },
        },
      });

      await promise;
    });

    it("should freeze the block and reject further modifications", async () => {
      // 1. Freeze the block
      const freezePromise = new Promise((resolve) => {
        clientSocket.on("liveblock:update", (update) => {
          if (update.isFrozen) {
            resolve();
          }
        });
      });

      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 0,
        action: {
          type: "FREEZE",
        },
      });

      await freezePromise;

      // 2. Attempt modification on frozen block
      const rejectPromise = new Promise((resolve) => {
        clientSocket.on("error", (error) => {
          expect(error.errorCode).toBe("LIVEBLOCK_FROZEN");
          resolve();
        });
      });

      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 1,
        action: {
          type: "ADD_ITEM",
          payload: { text: "Should fail" },
        },
      });

      await rejectPromise;
    });
  });

  describe("BullMQ Write-Behind Sync", () => {
    it("should debounce and persist Redis state to MongoDB after delay", async () => {
      const block = await request(app)
        .post("/api/v1/liveblocks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          conversationId: conversation._id.toString(),
          type: "poll",
          state: { options: [] },
        })
        .then((res) => res.body.data);

      // Clear Redis socket rate limiting key for test isolation
      const redis = getRedisClient();
      await redis.del(`socket:rate:${user._id.toString()}`);

      const clientSocket = Client(socketUrl, { auth: { token } });
      await new Promise((resolve) => clientSocket.on("ready", resolve));

      // Apply two rapid operations (ADD_OPTION)
      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 0,
        action: { type: "ADD_OPTION", payload: { text: "Option A" } },
      });

      await new Promise((resolve) => clientSocket.once("liveblock:update", resolve));

      clientSocket.emit("liveblock:action", {
        blockId: block.id,
        clientVersion: 1,
        action: { type: "ADD_OPTION", payload: { text: "Option B" } },
      });

      await new Promise((resolve) => clientSocket.once("liveblock:update", resolve));
      clientSocket.disconnect();

      // Check MongoDB immediately: it should still be version 0 (since BullMQ job is delayed by 2000ms)
      let dbBlock = await LiveBlock.findById(block.id);
      expect(dbBlock.version).toBe(0);

      // Wait 3 seconds to let BullMQ complete the delayed write-behind
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check MongoDB again: it should now be synced to version 2
      dbBlock = await LiveBlock.findById(block.id);
      expect(dbBlock.version).toBe(2);
      expect(dbBlock.state.options.length).toBe(2);
    }, 15000);
  });

  describe("Redis Recovery Strategy (Cache-aside)", () => {
    it("should recover the state from MongoDB on a Redis cache miss", async () => {
      // 1. Create a block in MongoDB
      const block = await request(app)
        .post("/api/v1/liveblocks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          conversationId: conversation._id.toString(),
          type: "checklist",
          state: { items: [{ id: "123", text: "Recover Me", completed: false }] },
        })
        .then((res) => res.body.data);

      // 2. Manually delete the cache from Redis
      const redis = getRedisClient();
      await redis.del(`liveblock:${block.id}`);

      // 3. Perform a GET request which should trigger recovery/repopulation
      const res = await request(app)
        .get(`/api/v1/liveblocks/${block.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.state.items[0].text).toBe("Recover Me");

      // 4. Verify that the cache is repopulated in Redis
      const cached = await redis.get(`liveblock:${block.id}`);
      expect(cached).not.toBeNull();
      expect(JSON.parse(cached).version).toBe(0);
    });
  });
});
