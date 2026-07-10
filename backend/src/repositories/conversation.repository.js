import Conversation from "../models/conversation.model.js";

class ConversationRepository {

  /* ================= FIND ================= */

  static async findById(conversationId, session = null) {

    const query = Conversation.findById(conversationId)
      .populate({
        path: "participants.user",
        select: "username avatar publicKey"
      })
      .populate({
        path: "createdBy",
        select: "username avatar"
      });

    if (session) query.session(session);

    return query;
  }

  static async findPrivateConversation(privateKey) {

    return Conversation.findOne({
      type: "private",
      privateKey
    }).populate({
      path: "participants.user",
      select: "username avatar publicKey"
    });

  }

  /* ================= CREATE ================= */

  static async create(data, session = null) {

    const [conversation] = await Conversation.create([data], { session });

    return Conversation.findById(conversation._id)
      .populate({
        path: "participants.user",
        select: "username avatar publicKey"
      });

  }

  /* ================= SAVE ================= */

  static async save(conversation, session = null) {

    await conversation.save({ session });

    return Conversation.findById(conversation._id)
      .populate({
        path: "participants.user",
        select: "username avatar publicKey"
      });

  }

  /* ================= UPDATE ================= */

static async updateOne(
  filter,
  update,
  options = {}
) {

  return Conversation.updateOne(
    filter,
    update,
    options
  );

}


  static async addParticipantAtomically(
    conversationId,
    newUserId
  ) {

    const filter = {

      _id: conversationId,

      // Only add if user NOT already present
      'participants.user': {
        $ne: newUserId
      }
    };

    const update = {

      $push: {
        participants: {
          user: newUserId,
          role: "member"
        }
      }
    };

    const options = {
      new: true,
      runValidators: true
    };

    return Conversation
      .findOneAndUpdate(
        filter,
        update,
        options
      )
      .populate({
        path: "participants.user",
        select: "username avatar publicKey"
      });
  }

  /* ================= PAGINATION ================= */

  static async findUserConversations(userId, skip, limit) {

    return Conversation.find({
      "participants.user": userId,
      deletedFor: { $ne: userId }
    })
      .populate({
        path: "participants.user",
        select: "username avatar publicKey"
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

  }

  static async countUserConversations(userId) {

    return Conversation.countDocuments({
      "participants.user": userId,
      deletedFor: { $ne: userId }
    });

  }

}

export default ConversationRepository;