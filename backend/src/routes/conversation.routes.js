import express from "express";
import {
  createPrivateConversation,
  createGroupConversation,
  updateGroupInfo,
  updateGroupSettings,
  addParticipant,
  removeParticipant,
  promoteToAdmin,
  demoteFromAdmin,
  transferOwnership,
  getMyConversations,
  deleteConversationForMe,
  generateInviteLink,
  revokeInviteLink,
  getInviteInfo,
  joinViaInvite,
  handleJoinRequest,
  muteConversation
} from "../controllers/conversation.controller.js";

import protect from "../middlewares/protect.middleware.js";
import { uploadAvatar } from '../middlewares/upload.middleware.js';

const router = express.Router();


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

// Invite Info (Note: placed before parameterized :conversationId routes)
router.get("/invite/:code", getInviteInfo);

/* ================= UPDATE ================= */

router.patch(
  "/:conversationId",
  uploadAvatar,
  updateGroupInfo
);

router.patch(
  "/:conversationId/settings",
  updateGroupSettings
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

router.patch(
  "/:conversationId/demote",
  demoteFromAdmin
);

router.patch(
  "/:conversationId/transfer",
  transferOwnership
);

/* ================= INVITES & JOIN REQUESTS ================= */

router.post("/:conversationId/invite", generateInviteLink);
router.post("/:conversationId/invite/revoke", revokeInviteLink);
router.post("/invite/:code/join", joinViaInvite);
router.post("/:conversationId/requests", handleJoinRequest);
router.post("/:conversationId/mute", muteConversation);

/* ================= DELETE ================= */

router.delete("/:conversationId", deleteConversationForMe);

export default router;