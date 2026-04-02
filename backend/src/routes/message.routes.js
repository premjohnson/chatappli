import express from "express";
import protect from "../middlewares/protect.middleware.js";

import {
  sendMessage,
  getMessages,
  editMessage,
  markAsRead,
  deleteForMe,
  deleteForEveryone
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(protect);

/* ================= CREATE ================= */
router.post("/", sendMessage);

/* ================= READ ================= */
router.get("/:conversationId", getMessages);

/* ================= UPDATE ================= */
router.patch("/:messageId", editMessage);
router.patch("/:conversationId/read", markAsRead);

/* ================= DELETE ================= */
router.delete("/:messageId/me", deleteForMe);
router.delete("/:messageId/everyone", deleteForEveryone);

export default router;