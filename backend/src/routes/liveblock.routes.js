import express from "express";
import protect from "../middlewares/protect.middleware.js";
import { liveblockLimiter } from "../middlewares/rateLimit.middleware.js";
import { createLiveBlock, getLiveBlock } from "../controllers/liveblock.controller.js";

const router = express.Router();

// Apply auth protection & rate limiting globally to all LiveBlock routes
router.use(protect);
router.use(liveblockLimiter);

/* ================= POST: Create LiveBlock ================= */
router.post("/", createLiveBlock);

/* ================= GET: Retrieve LiveBlock ================= */
router.get("/:blockId", getLiveBlock);

export default router;
