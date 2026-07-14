import express from "express";
import protect from "../middlewares/protect.middleware.js";

import {
  sendMessage,
  getMessages,
  editMessage,
  markAsRead,
  deleteForMe,
  deleteForEveryone,
  uploadChatFile,
  reactToMessage,
  togglePin,
  toggleStar
} from "../controllers/message.controller.js";
import { uploadChatFileSingle } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(protect);

/* ================= CREATE ================= */
router.post("/", sendMessage);
router.post("/upload", uploadChatFileSingle, uploadChatFile);

/* ================= READ ================= */
router.get("/:conversationId", getMessages);

/* ================= UPDATE ================= */
router.patch("/:messageId", editMessage);
router.patch("/:conversationId/read", markAsRead);
router.post("/:messageId/react", reactToMessage);
router.post("/:messageId/pin", togglePin);
router.post("/:messageId/star", toggleStar);

/* ================= DELETE ================= */
router.delete("/:messageId/me", deleteForMe);
router.delete("/:messageId/everyone", deleteForEveryone);

export default router;