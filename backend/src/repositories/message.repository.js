import Message from "../models/message.model.js";

class MessageRepository {

  /* ================= FIND ================= */

  static async findById(messageId, session = null) {
    const query = Message.findById(messageId);
    if (session) query.session(session);
    return query;
  }

  static async findByClientMessageId(clientMessageId, session = null) {
    const query = Message.findOne({ clientMessageId });
    if (session) query.session(session);
    return query;
  }

  /* ================= CREATE ================= */

  static async create(data, session = null) {
    const [message] = await Message.create([data], { session });
    return message;
  }

  /* ================= SAVE ================= */

  static async save(message, session = null) {
    return message.save({ session });
  }

  /* ================= UPDATE ================= */

  static async updateOne(filter, update, session = null) {
    return Message.updateOne(filter, update, { session });
  }

  static async updateMany(filter, update, session = null) {
    return Message.updateMany(filter, update, { session });
  }

  /* ================= GET MESSAGES ================= */

  static async findMessages(conversationId, cursor, limit) {

    const query = { conversation: conversationId };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    return Message.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .lean();
  }

}

export default MessageRepository;