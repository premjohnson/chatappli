import { uploadImageBuffer, deleteImage } from "../utils/cloudinary.util.js";
import TransactionManager from "../core/transaction.manager.js";
import ConversationRepository from "../repositories/conversation.repository.js";

class ConversationService {

/* ================= PRIVATE CHAT ================= */

static async createPrivateConversation(
  userId,
  targetUserId
) {

  // ============================================
  // PREVENT SELF CONVERSATION
  // ============================================

  if (
    userId.toString() ===
    targetUserId.toString()
  ) {
    throw new Error(
      "Cannot create conversation with yourself"
    );
  }

  // ============================================
  // GENERATE DETERMINISTIC PRIVATE KEY
  // Prevent duplicate private conversations
  // ============================================

  const privateKey =

    [userId, targetUserId]

      .map(id => id.toString())

      .sort()

      .join(':');

  // ============================================
  // CHECK EXISTING CONVERSATION
  // ============================================

  const existing =

    await ConversationRepository
      .findPrivateConversation(
        privateKey
      );

  if (existing)
    return existing;

  // ============================================
  // CREATE PRIVATE CONVERSATION
  // ============================================

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

/* ================= GROUP CREATE ================= */

  static async createGroupConversation(
    userId,
    data,
    file
  ) {

    if (!data.groupName)
      throw new Error("Group name required");

    // ============================================
    // NORMALIZE + DEDUPE MEMBER IDS
    // ============================================

    const members = [
      ...new Set(
        data.members.map(
          id => id.toString()
        )
      )
    ];

    // ============================================
    // REMOVE OWNER FROM MEMBER LIST
    // Prevent duplicate owner participant
    // ============================================

    const normalizedMembers =
      members.filter(
        id => id !== userId.toString()
      );

    // ============================================
    // BUILD PARTICIPANTS
    // ============================================

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

    // ============================================
    // UPLOAD GROUP AVATAR
    // ============================================

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

    // ============================================
    // CREATE CONVERSATION
    // ============================================

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

  /* ================= UPDATE GROUP INFO ================= */
static async updateGroupInfo(conversationId, userId, data, file) {

    return TransactionManager.run(async (session) => {

      const conversation =
        await ConversationRepository.findById(conversationId, session);

      if (!conversation)
        throw new Error("Conversation not found");

      const requester = conversation.participants.find(p =>
        p.user.toString() === userId.toString()
      );

      if (!requester || !["owner", "admin"].includes(requester.role))
        throw new Error("Permission denied");

      if (data.groupName)
        conversation.groupName = data.groupName;

      if (data.groupAbout)
        conversation.groupAbout = data.groupAbout;

      if (file) {

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


/* ================= ADD MEMBER ================= */

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
    throw new Error("Conversation not found");

  const requester =
    conversation.participants.find(
      p => p.user.toString() === userId.toString()
    );

  if (!requester)
    throw new Error("Unauthorized");

  if (
    conversation.groupSettings
      .onlyAdminsCanAddMembers &&
    !["owner", "admin"]
      .includes(requester.role)
  ) {
    throw new Error("Permission denied");
  }

  // ============================================
  // ATOMIC UPDATE
  // Prevent duplicate users safely
  // ============================================

  const updatedConversation =
    await ConversationRepository.addParticipantAtomically(
      conversationId,
      newUserId
    );

  if (!updatedConversation) {
    throw new Error(
      "User already in group"
    );
  }

  return updatedConversation;
}

  /* ================= REMOVE MEMBER ================= */
  static async removeParticipant(conversationId, userId, removeUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new Error("Conversation not found");

  const requester = conversation.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (!requester)
    throw new Error("Unauthorized");

  if (
    requester.role !== "owner" &&
    userId.toString() !== removeUserId.toString()
  )
    throw new Error("Permission denied");

  conversation.participants =
    conversation.participants.filter(
      p => p.user.toString() !== removeUserId.toString()
    );

  return ConversationRepository.save(conversation);
}

  /* ================= PROMOTE ADMIN ================= */
  static async promoteToAdmin(conversationId, userId, targetUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new Error("Conversation not found");

  const requester = conversation.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (!requester || requester.role !== "owner")
    throw new Error("Only owner can promote");

  const target = conversation.participants.find(
    p => p.user.toString() === targetUserId.toString()
  );

  if (!target)
    throw new Error("User not found");

  target.role = "admin";

  return ConversationRepository.save(conversation);
}

  /* ================= SOFT DELETE ================= */
  static async deleteConversationForUser(conversationId, userId) {

  await ConversationRepository.updateOne(
    { _id: conversationId },
    { $addToSet: { deletedFor: userId } }
  );

}

  /* ================= GET USER CONVERSATIONS (PAGINATED) ================= */
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
