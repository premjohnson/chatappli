import ConversationService from '../services/conversation.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getIO } from '../socket/socket.server.js';

//CREATE PRIVATE CONV

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

//CREATE GROUP CONV

export const createGroupConversation = asyncHandler(async (req, res) => {
  const { groupName, groupAbout, members } = req.body;

  if (!groupName) {
    return res.status(400).json({
      status: 'fail',
      message: 'groupName is required'
    });
  }

  let normalizedMembers = [];
  if (typeof members === 'string') {
    try {
      normalizedMembers = JSON.parse(members);
      if (!Array.isArray(normalizedMembers)) {
        normalizedMembers = [members];
      }
    } catch {
      if (members.includes(',')) {
        normalizedMembers = members.split(',').map(m => m.trim());
      } else {
        normalizedMembers = [members];
      }
    }
  } else if (Array.isArray(members)) {
    normalizedMembers = members;
  }

  if (normalizedMembers.length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'members must not be empty'
    });
  }

  const conversation =
    await ConversationService.createGroupConversation(
      req.user._id,
      {
        groupName,
        groupAbout,
        members: normalizedMembers
      },
      req.file
    );

  return res.status(201).json({
    status: 'success',
    data: conversation
  });
});

//UPDATE GROUP CONV 

export const updateGroupInfo = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;

  const conversation =
    await ConversationService.updateGroupInfo(
      conversationId,
      req.user._id,
      req.body,
      req.file
    );

  const io = getIO();
  io.to(conversationId).emit("group:update", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

//ADD MEMBE CONV

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

  const io = getIO();
  io.to(conversationId).emit("group:member:add", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

// REMOVE MEMBER CONV

export const removeParticipant = asyncHandler(async (req, res) => {

  const { conversationId, userId } = req.params;

  const conversation =
    await ConversationService.removeParticipant(
      conversationId,
      req.user._id,
      userId
    );

  const io = getIO();
  // Emit to conversation room to alert all online users
  io.to(conversationId).emit("group:member:remove", { conversationId, userId });
  // Send updated conversation info to remaining participants
  io.to(conversationId).emit("group:update", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

// PROMOTE ADMIN CONV 

export const promoteToAdmin = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;
  const { userId } = req.body;

  const conversation =
    await ConversationService.promoteToAdmin(
      conversationId,
      req.user._id,
      userId
    );

  const io = getIO();
  io.to(conversationId).emit("group:member:role", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

// DEMOTE ADMIN CONV

export const demoteFromAdmin = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;
  const { userId } = req.body;

  const conversation =
    await ConversationService.demoteAdmin(
      conversationId,
      req.user._id,
      userId
    );

  const io = getIO();
  io.to(conversationId).emit("group:member:role", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

// TRANSFER OWNERSHIP CONV

export const transferOwnership = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;
  const { userId } = req.body;

  const conversation =
    await ConversationService.transferOwnership(
      conversationId,
      req.user._id,
      userId
    );

  const io = getIO();
  io.to(conversationId).emit("group:member:role", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

//UPDATE GROUP SETTINGS CONV

export const updateGroupSettings = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await ConversationService.updateGroupSettings(
    conversationId,
    req.user._id,
    req.body
  );

  const io = getIO();
  io.to(conversationId).emit("group:permission:update", conversation);
  io.to(conversationId).emit("group:update", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

//GET USER CONVERSATIONS CONV

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

//SOFT DELETE CONV

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

// GENERATE INVITE LINK

export const generateInviteLink = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { expiresAt, maxUses } = req.body;

  const newLink = await ConversationService.generateInviteLink(
    conversationId,
    req.user._id,
    { expiresAt, maxUses }
  );

  return res.json({
    status: 'success',
    data: newLink
  });
});

// REVOKE INVITE LINK

export const revokeInviteLink = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { code } = req.body;

  const conversation = await ConversationService.revokeInviteLink(
    conversationId,
    req.user._id,
    code
  );

  const io = getIO();
  io.to(conversationId).emit("group:update", conversation);

  return res.json({
    status: 'success',
    data: conversation
  });
});

// GET INVITE INFO

export const getInviteInfo = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const info = await ConversationService.getInviteInfo(code);

  return res.json({
    status: 'success',
    data: info
  });
});

// JOIN VIA INVITE

export const joinViaInvite = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const result = await ConversationService.joinViaInvite(code, req.user._id);

  if (result.status === "joined") {
    const io = getIO();
    io.to(result.conversation._id.toString()).emit("group:member:add", result.conversation);
  }

  return res.json({
    status: 'success',
    data: result
  });
});

// HANDLE JOIN REQUEST

export const handleJoinRequest = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { requesterId, action } = req.body;

  if (!requesterId || !["approve", "reject"].includes(action)) {
    return res.status(400).json({
      status: 'fail',
      message: 'requesterId and valid action (approve/reject) required'
    });
  }

  const conversation = await ConversationService.handleJoinRequest(
    conversationId,
    req.user._id,
    requesterId,
    action
  );

  const io = getIO();
  if (action === "approve") {
    io.to(conversationId).emit("group:member:add", conversation);
  } else {
    io.to(conversationId).emit("group:update", conversation);
  }

  return res.json({
    status: 'success',
    data: conversation
  });
});

// MUTE CONVERSATION CONV

export const muteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { muteType, durationSeconds } = req.body;

  const conversation = await ConversationService.muteConversation(
    conversationId,
    req.user._id,
    { muteType, durationSeconds }
  );

  return res.json({
    status: 'success',
    data: conversation
  });
});