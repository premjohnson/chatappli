import { uploadImageBuffer, deleteImage } from "../utils/cloudinary.util.js";
import TransactionManager from "../core/transaction.manager.js";
import ConversationRepository from "../repositories/conversation.repository.js";

class ConversationService {

  /* ================= PRIVATE CHAT ================= */
  static async createPrivateConversation(userId, targetUserId) {

  if (userId.toString() === targetUserId.toString())
    throw new Error("Cannot create conversation with yourself");

  const existing =
    await ConversationRepository.findPrivateConversation(userId, targetUserId);

  if (existing) return existing;

  return ConversationRepository.create({
    type: "private",
    participants: [
      { user: userId, role: "member" },
      { user: targetUserId, role: "member" }
    ],
    createdBy: userId,
    encryptionMeta: {
      algorithm: "nacl-box",
      sharedKeyId: null
    }
  });
}

  /* ================= GROUP CREATE ================= */
  static async createGroupConversation(userId, data, file) {

  if (!data.groupName)
    throw new Error("Group name required");

  const members = [...new Set(data.members)];

  const participants = [
    { user: userId, role: "owner" },
    ...members.map(id => ({ user: id, role: "member" }))
  ];

  let avatarData;

  if (file) {
    const upload = await uploadImageBuffer(file.buffer);

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

  /* ================= UPDATE GROUP INFO ================= */
static async updateGroupInfo(conversationId, userId, data, file) {

    return TransactionManager.run(async (session) => {

      const conversation =
        await ConversationRepository.findById(conversationId, session);

      if (!conversation)
        throw new Error("Conversation not found");

      const requester = conversation.participants.find(p =>
        p.user.equals(userId)
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
  static async addParticipant(conversationId, userId, newUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new Error("Conversation not found");

  const requester = conversation.participants.find(
    p => p.user.equals(userId)
  );

  if (!requester)
    throw new Error("Unauthorized");

  if (
    conversation.groupSettings.onlyAdminsCanAddMembers &&
    !["owner", "admin"].includes(requester.role)
  )
    throw new Error("Permission denied");

  const exists = conversation.participants.find(
    p => p.user.equals(newUserId)
  );

  if (exists)
    throw new Error("User already in group");

  conversation.participants.push({
    user: newUserId,
    role: "member"
  });

  return ConversationRepository.save(conversation);
}

  /* ================= REMOVE MEMBER ================= */
  static async removeParticipant(conversationId, userId, removeUserId) {

  const conversation =
    await ConversationRepository.findById(conversationId);

  if (!conversation)
    throw new Error("Conversation not found");

  const requester = conversation.participants.find(
    p => p.user.equals(userId)
  );

  if (!requester)
    throw new Error("Unauthorized");

  if (
    requester.role !== "owner" &&
    !userId.equals(removeUserId)
  )
    throw new Error("Permission denied");

  conversation.participants =
    conversation.participants.filter(
      p => !p.user.equals(removeUserId)
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
    p => p.user.equals(userId)
  );

  if (!requester || requester.role !== "owner")
    throw new Error("Only owner can promote");

  const target = conversation.participants.find(
    p => p.user.equals(targetUserId)
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
    pages: Math.ceil(total / limit),
    data: conversations
  };
}
}

export default ConversationService;