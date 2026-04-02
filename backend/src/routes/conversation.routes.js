import express from "express";
import {
  createPrivateConversation,
  createGroupConversation,
  updateGroupInfo,
  addParticipant,
  removeParticipant,
  promoteToAdmin,
  getMyConversations,
  deleteConversationForMe
} from "../controllers/conversation.controller.js";

import protect from "../middlewares/protect.middleware.js";
import { uploadAvatar } from '../middlewares/upload.middleware.js';

const router = express.Router();

/* ================= ALL ROUTES PROTECTED ================= */
router.use(protect);

/* ================= CREATE ================= */

router.post("/private", createPrivateConversation);

router.post(
  "/group",
  uploadAvatar,
  createGroupConversation
);



/* ================= READ ================= */

router.get("/", getMyConversations);

/* ================= UPDATE ================= */

router.patch(
  "/:conversationId",
  uploadAvatar,
  updateGroupInfo
);

/* ================= MEMBERS ================= */

router.post("/:conversationId/members", addParticipant);

router.delete(
  "/:conversationId/members/:userId",
  removeParticipant
);

router.patch(
  "/:conversationId/promote",
  promoteToAdmin
);

/* ================= DELETE ================= */

router.delete("/:conversationId", deleteConversationForMe);

export default router;