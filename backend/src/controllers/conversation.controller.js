import ConversationService from '../services/conversation.service.js';
import asyncHandler from '../utils/asyncHandler.js';

/* ================= CREATE PRIVATE ================= */

export const createPrivateConversation = asyncHandler(async (req, res) => {

  const { targetUserId } = req.body;

  if (!targetUserId)
    return res.status(400).json({
      status: 'fail',
      message: 'targetUserId required'
    });

  const conversation =
    await ConversationService.createPrivateConversation(
      req.user._id,
      targetUserId
    );

  return res.status(201).json({
    status: 'success',
    data: conversation
  });
});

/* ================= CREATE GROUP ================= */

export const createGroupConversation = asyncHandler(async (req, res) => {

  const { groupName, groupAbout, members } = req.body;

  if (!groupName || !members || !Array.isArray(members))
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid group data'
    });

  const conversation =
    await ConversationService.createGroupConversation(
      req.user._id,
      {
        groupName,
        groupAbout,
        members
      },
      req.file
    );

  return res.status(201).json({
    status: 'success',
    data: conversation
  });
});

/* ================= UPDATE GROUP ================= */

export const updateGroupInfo = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;

  const conversation =
    await ConversationService.updateGroupInfo(
      conversationId,
      req.user._id,
      req.body,
      req.file
    );

  return res.json({
    status: 'success',
    data: conversation
  });
});

/* ================= ADD MEMBER ================= */

export const addParticipant = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;
  const { userId } = req.body;

  if (!userId)
    return res.status(400).json({
      status: 'fail',
      message: 'userId required'
    });

  const conversation =
    await ConversationService.addParticipant(
      conversationId,
      req.user._id,
      userId
    );

  return res.json({
    status: 'success',
    data: conversation
  });
});

/* ================= REMOVE MEMBER ================= */

export const removeParticipant = asyncHandler(async (req, res) => {

  const { conversationId, userId } = req.params;

  const conversation =
    await ConversationService.removeParticipant(
      conversationId,
      req.user._id,
      userId
    );

  return res.json({
    status: 'success',
    data: conversation
  });
});

/* ================= PROMOTE ADMIN ================= */

export const promoteToAdmin = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;
  const { userId } = req.body;

  const conversation =
    await ConversationService.promoteToAdmin(
      conversationId,
      req.user._id,
      userId
    );

  return res.json({
    status: 'success',
    data: conversation
  });
});

/* ================= GET USER CONVERSATIONS ================= */

export const getMyConversations = asyncHandler(async (req, res) => {

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const result = await ConversationService.getUserConversations(
    req.user._id,
    { page, limit }
  );

  res.json({
    status: "success",
    ...result
  });
});

/* ================= SOFT DELETE ================= */

export const deleteConversationForMe = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;

  await ConversationService.deleteConversationForUser(
    conversationId,
    req.user._id
  );

  return res.json({
    status: 'success',
    message: 'Conversation deleted for user'
  });
});