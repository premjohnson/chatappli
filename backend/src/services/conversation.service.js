import { uploadImageBuffer, deleteImage } from "../utils/cloudinary.util.js";
import TransactionManager from "../core/transaction.manager.js";
import ConversationRepository from "../repositories/conversation.repository.js";
import AppError from "../utils/appError.js";
import { ERROR_CODES } from "../utils/errorConstants.js";
import crypto from "crypto";
import mongoose from "mongoose";

class ConversationService {

//private conversation creation

static async createPrivateConversation(
  userId,
  targetUserId
) {

  if (
    userId.toString() ===
    targetUserId.toString()
  ) {
    throw new Error(
      "Cannot create conversation with yourself"
    );
  }

  const privateKey =

    [userId, targetUserId]

      .map(id => id.toString())

      .sort()

      .join(':');
  const existing =

    await ConversationRepository
      .findPrivateConversation(
        privateKey
      );

  if (existing)
    return existing;

  return ConversationRepository.create({

    type: "private",

    privateKey,

    participants: [

      {
        user: userId,
        role: "member"
      },

      {
        user: targetUserId,
        role: "member"
      }
    ],

    createdBy: userId,

    encryptionMeta: {

      algorithm: "nacl-box",

      sharedKeyId: null
    }
  });
}

//group conversation creation

  static async createGroupConversation(
    userId,
    data,
    file
  ) {

    if (!data.groupName)
      throw new Error("Group name required");


    const members = [
      ...new Set(
        data.members.map(
          id => id.toString()
        )
      )
    ];

    const normalizedMembers =
      members.filter(
        id => id !== userId.toString()
      );

    const participants = [

      {
        user: userId,
        role: "owner"
      },

      ...normalizedMembers.map(id => ({
        user: id,
        role: "member"
      }))
    ];

    let avatarData;

    if (file) {

      const upload =
        await uploadImageBuffer(
          file.buffer
        );

      avatarData = {
        publicId: upload.public_id,
        url: upload.secure_url
      };
    }

    return ConversationRepository.create({

      type: "group",

      groupName: data.groupName,

      groupAbout: data.groupAbout,

      groupAvatar: avatarData,

      groupSettings: {
        onlyAdminsCanSend: false,
        onlyAdminsCanAddMembers: true,
        onlyAdminsCanEditInfo: true
      },

      participants,

      createdBy: userId,

      encryptionMeta: {
        algorithm: "nacl-box",
        sharedKeyId: null
      }
    });
  }

//update group info (name, about, avatar)
static async updateGroupInfo(conversationId, userId, data, file) {

    return TransactionManager.run(async (session) => {

      const conversation =
        await ConversationRepository.findById(conversationId, session);

      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const requester = conversation.participants.find(p =>
        (p.user._id || p.user).toString() === userId.toString()
      );

      if (!requester)
        throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

      const isRequesterAdminOrOwner = ["owner", "admin"].includes(requester.role);
      const canEdit = !conversation.groupSettings?.onlyAdminsCanEditInfo || isRequesterAdminOrOwner;

      if (!canEdit)
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

      if (data.groupName !== undefined)
        conversation.groupName = data.groupName;

      if (data.groupAbout !== undefined)
        conversation.groupAbout = data.groupAbout;

      if (data.removeAvatar === true || data.removeAvatar === "true") {
        if (conversation.groupAvatar?.publicId) {
          await deleteImage(conversation.groupAvatar.publicId);
        }
        conversation.groupAvatar = undefined;
      } else if (file) {
        if (conversation.groupAvatar?.publicId) {
          await deleteImage(conversation.groupAvatar.publicId);
        }

        const upload = await uploadImageBuffer(file.buffer);

        conversation.groupAvatar = {
          publicId: upload.public_id,
          url: upload.secure_url
        };
      }

      await ConversationRepository.save(conversation, session);

      return conversation;

    });

  }

//add participant to group conversation

static async addParticipant(
  conversationId,
  userId,
  newUserId
) {

  const conversation =
    await ConversationRepository.findById(
      conversationId
    );

  if (!conversation)
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

  const requester =
    conversation.participants.find(
      p => (p.user._id || p.user).toString() === userId.toString()
    );

  if (!requester)
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

  if (
    conversation.groupSettings
      .onlyAdminsCanAddMembers &&
    !["owner", "admin"]
      .includes(requester.role)
  ) {
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);
  }


  const updatedConversation =
    await ConversationRepository.addParticipantAtomically(
      conversationId,
      newUserId
    );

  if (!updatedConversation) {
    throw new AppError(ERROR_CODES.ALREADY_EXISTS, 409);
  }

  return updatedConversation;
}

  static async removeParticipant(conversationId, userId, removeUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

  const requester = conversation.participants.find(
    p => (p.user._id || p.user).toString() === userId.toString()
  );

  if (!requester)
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

  const target = conversation.participants.find(
    p => (p.user._id || p.user).toString() === removeUserId.toString()
  );

  if (!target)
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 404);

  const isSelf = userId.toString() === removeUserId.toString();

  if (!isSelf) {
    const isOwner = requester.role === "owner";
    const isAdmin = requester.role === "admin";
    const targetIsAdminOrOwner = ["owner", "admin"].includes(target.role);

    if (!isOwner && !isAdmin) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);
    }

    if (isAdmin && targetIsAdminOrOwner) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);
    }
  } else {
    if (requester.role === "owner" && conversation.participants.length > 1) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400);
    }
  }

  conversation.participants =
    conversation.participants.filter(
      p => (p.user._id || p.user).toString() !== removeUserId.toString()
    );

  return ConversationRepository.save(conversation);
}

//promote member to admin in group conversation
  static async promoteToAdmin(conversationId, userId, targetUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

  const requester = conversation.participants.find(
    p => (p.user._id || p.user).toString() === userId.toString()
  );

  if (!requester)
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

  if (requester.role !== "owner" && requester.role !== "admin")
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

  const target = conversation.participants.find(
    p => (p.user._id || p.user).toString() === targetUserId.toString()
  );

  if (!target)
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 404);

  target.role = "admin";

  return ConversationRepository.save(conversation);
}

//demote admin to member in group conversation
  static async demoteAdmin(conversationId, userId, targetUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

  const requester = conversation.participants.find(
    p => (p.user._id || p.user).toString() === userId.toString()
  );

  if (!requester)
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

  if (requester.role !== "owner")
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

  const target = conversation.participants.find(
    p => (p.user._id || p.user).toString() === targetUserId.toString()
  );

  if (!target)
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 404);

  target.role = "member";

  return ConversationRepository.save(conversation);
}

//transfer group ownership
  static async transferOwnership(conversationId, userId, newOwnerId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

  const requester = conversation.participants.find(
    p => (p.user._id || p.user).toString() === userId.toString()
  );

  if (!requester)
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

  if (requester.role !== "owner")
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

  const target = conversation.participants.find(
    p => (p.user._id || p.user).toString() === newOwnerId.toString()
  );

  if (!target)
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 404);

  requester.role = "admin";
  target.role = "owner";

  return ConversationRepository.save(conversation);
}
//update group settings
  static async updateGroupSettings(conversationId, userId, settings) {

    return TransactionManager.run(async (session) => {

      const conversation =
        await ConversationRepository.findById(conversationId, session);

      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const requester = conversation.participants.find(
        p => (p.user._id || p.user).toString() === userId.toString()
      );

      if (!requester || !["owner", "admin"].includes(requester.role)) {
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);
      }

      if (!conversation.groupSettings) {
        conversation.groupSettings = {};
      }

      const booleanFields = [
        "onlyAdminsCanSend",
        "onlyAdminsCanAddMembers",
        "onlyAdminsCanRemoveMembers",
        "onlyAdminsCanEditInfo",
        "onlyAdminsCanPinMessages",
        "memberApprovalsEnabled"
      ];

      booleanFields.forEach(field => {
        if (settings[field] !== undefined) {
          conversation.groupSettings[field] = settings[field] === true || settings[field] === "true";
        }
      });

      if (settings.slowModeDelay !== undefined) {
        conversation.groupSettings.slowModeDelay = Math.max(0, parseInt(settings.slowModeDelay) || 0);
      }

      if (settings.disappearingDuration !== undefined) {
        conversation.groupSettings.disappearingDuration = Math.max(0, parseInt(settings.disappearingDuration) || 0);
      }

      await ConversationRepository.save(conversation, session);

      return conversation;

    });

  }

//delete conversation for user (soft delete)
  // generate invite link
  static async generateInviteLink(conversationId, userId, options = {}) {
    return TransactionManager.run(async (session) => {
      const conversation = await ConversationRepository.findById(conversationId, session);
      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const requester = conversation.participants.find(
        p => (p.user._id || p.user).toString() === userId.toString()
      );

      if (!requester || !["owner", "admin"].includes(requester.role))
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

      // Deactivate previous active links
      conversation.inviteLinks.forEach(link => {
        if (link.isActive) link.isActive = false;
      });

      const code = crypto.randomBytes(12).toString("hex");
      const newLink = {
        code,
        createdBy: userId,
        expiresAt: options.expiresAt ? new Date(options.expiresAt) : undefined,
        maxUses: options.maxUses ? parseInt(options.maxUses) : undefined,
        isActive: true,
        usesCount: 0,
        createdAt: new Date()
      };

      conversation.inviteLinks.push(newLink);
      await ConversationRepository.save(conversation, session);
      return newLink;
    });
  }

  // revoke invite link
  static async revokeInviteLink(conversationId, userId, code) {
    return TransactionManager.run(async (session) => {
      const conversation = await ConversationRepository.findById(conversationId, session);
      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const requester = conversation.participants.find(
        p => (p.user._id || p.user).toString() === userId.toString()
      );

      if (!requester || !["owner", "admin"].includes(requester.role))
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

      const link = conversation.inviteLinks.find(l => l.code === code);
      if (!link)
        throw new AppError(ERROR_CODES.NOT_FOUND, 404);

      link.isActive = false;
      await ConversationRepository.save(conversation, session);
      return conversation;
    });
  }

  // get invite metadata
  static async getInviteInfo(code) {
    // Find conversation that has an active link matching code
    const conversation = await mongoose.model("Conversation").findOne({ "inviteLinks.code": code })
      .populate("participants.user", "username avatar")
      .populate("createdBy", "username avatar");

    if (!conversation)
      throw new AppError(ERROR_CODES.NOT_FOUND, 404);

    const link = conversation.inviteLinks.find(l => l.code === code);
    if (!link || !link.isActive)
      throw new AppError(ERROR_CODES.NOT_FOUND, 404);

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw new AppError(ERROR_CODES.WINDOW_EXPIRED, 400);
    }

    if (link.maxUses && link.usesCount >= link.maxUses) {
      throw new AppError(ERROR_CODES.WINDOW_EXPIRED, 400);
    }

    return {
      conversationId: conversation._id,
      groupName: conversation.groupName,
      groupAbout: conversation.groupAbout,
      groupAvatar: conversation.groupAvatar,
      participantsCount: conversation.participants.length,
      createdBy: conversation.createdBy,
      createdAt: conversation.createdAt,
      memberApprovalsEnabled: conversation.groupSettings?.memberApprovalsEnabled || false
    };
  }

  // join via invite code
  static async joinViaInvite(code, userId) {
    return TransactionManager.run(async (session) => {
      const conversation = await mongoose.model("Conversation").findOne({ "inviteLinks.code": code }).session(session);
      if (!conversation)
        throw new AppError(ERROR_CODES.NOT_FOUND, 404);

      const link = conversation.inviteLinks.find(l => l.code === code);
      if (!link || !link.isActive)
        throw new AppError(ERROR_CODES.NOT_FOUND, 404);

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        throw new AppError(ERROR_CODES.WINDOW_EXPIRED, 400);
      }

      if (link.maxUses && link.usesCount >= link.maxUses) {
        throw new AppError(ERROR_CODES.WINDOW_EXPIRED, 400);
      }

      const alreadyParticipant = conversation.participants.some(
        p => p.user.toString() === userId.toString()
      );

      if (alreadyParticipant) {
        throw new AppError(ERROR_CODES.ALREADY_EXISTS, 409);
      }

      // Require admin approval
      if (conversation.groupSettings?.memberApprovalsEnabled) {
        const alreadyRequested = conversation.joinRequests.some(
          r => r.user.toString() === userId.toString()
        );
        if (!alreadyRequested) {
          conversation.joinRequests.push({ user: userId, requestedAt: new Date() });
          await conversation.save({ session });
        }
        return { status: "pending_approval" };
      }

      // Join directly
      conversation.participants.push({
        user: userId,
        role: "member",
        joinedAt: new Date()
      });

      link.usesCount += 1;
      await conversation.save({ session });

      const populated = await ConversationRepository.findById(conversation._id, session);
      return { status: "joined", conversation: populated };
    });
  }

  // handle join request (approve/reject)
  static async handleJoinRequest(conversationId, userId, requesterId, action) {
    return TransactionManager.run(async (session) => {
      const conversation = await ConversationRepository.findById(conversationId, session);
      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const requester = conversation.participants.find(
        p => (p.user._id || p.user).toString() === userId.toString()
      );

      if (!requester || !["owner", "admin"].includes(requester.role))
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

      const requestIndex = conversation.joinRequests.findIndex(
        r => r.user.toString() === requesterId.toString()
      );

      if (requestIndex === -1)
        throw new AppError(ERROR_CODES.USER_NOT_FOUND, 404);

      conversation.joinRequests.splice(requestIndex, 1);

      if (action === "approve") {
        const alreadyParticipant = conversation.participants.some(
          p => (p.user._id || p.user).toString() === requesterId.toString()
        );
        if (!alreadyParticipant) {
          conversation.participants.push({
            user: requesterId,
            role: "member",
            joinedAt: new Date()
          });
        }
      }

      await ConversationRepository.save(conversation, session);
      return conversation;
    });
  }

  // mute or unmute conversation for user
  static async muteConversation(conversationId, userId, { muteType, durationSeconds }) {
    return TransactionManager.run(async (session) => {
      const conversation = await ConversationRepository.findById(conversationId, session);
      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const participant = conversation.participants.find(
        p => (p.user._id || p.user).toString() === userId.toString()
      );

      if (!participant)
        throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

      if (muteType === "unmute" || !muteType) {
        participant.isMuted = false;
        participant.muteUntil = null;
        participant.muteType = null;
      } else {
        participant.isMuted = true;
        participant.muteType = muteType;
        if (muteType === "8_hours") {
          participant.muteUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
        } else if (muteType === "1_day") {
          participant.muteUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } else if (muteType === "1_week") {
          participant.muteUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        } else if (muteType === "always") {
          participant.muteUntil = new Date("3000-01-01");
        } else if (muteType === "custom" && durationSeconds) {
          participant.muteUntil = new Date(Date.now() + parseInt(durationSeconds) * 1000);
        } else {
          throw new AppError("Invalid mute type", 400);
        }
      }

      await ConversationRepository.save(conversation, session);
      return conversation;
    });
  }

  static async deleteConversationForUser(conversationId, userId) {

  await ConversationRepository.updateOne(
    { _id: conversationId },
    { $addToSet: { deletedFor: userId } }
  );

}

//get user conversations with pagination
  static async getUserConversations(userId, { page = 1, limit = 20 }) {

  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([

    ConversationRepository.findUserConversations(
      userId,
      skip,
      limit
    ),

    ConversationRepository.countUserConversations(userId)

  ]);

  return {
    results: conversations.length,
    total,
    page,
    pages: Math.ceil(total),
    data: conversations
  };
}
}

export default ConversationService;
