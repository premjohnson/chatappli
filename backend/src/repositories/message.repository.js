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

  static async findUnreadMessagesForUser(conversationId, userId, session = null) {
    const query = Message.find({
      conversation: conversationId,
      sender: { $ne: userId },
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: userId },
      deliveryReceipts: {
        $not: {
          $elemMatch: {
            user: userId,
            readAt: { $exists: true, $ne: null }
          }
        }
      }
    });

    if (session) query.session(session);

    return query;
  }

  static async markReceiptDelivered(messageId, userId, deliveredAt, session = null) {
    const existingReceiptUpdate = await Message.updateOne(
      {
        _id: messageId,
        "deliveryReceipts.user": userId
      },
      {
        $set: {
          "deliveryReceipts.$[receipt].deliveredAt": deliveredAt
        }
      },
      {
        session,
        arrayFilters: [
          {
            "receipt.user": userId,
            "receipt.deliveredAt": null
          }
        ]
      }
    );

    if (existingReceiptUpdate.matchedCount > 0) {
      return existingReceiptUpdate;
    }

    return Message.updateOne(
      {
        _id: messageId,
        "deliveryReceipts.user": { $ne: userId }
      },
      {
        $push: {
          deliveryReceipts: {
            user: userId,
            deliveredAt
          }
        }
      },
      { session }
    );
  }

  static async markReceiptRead(messageId, userId, readAt, session = null) {
    const existingReceiptUpdate = await Message.updateOne(
      {
        _id: messageId,
        "deliveryReceipts.user": userId
      },
      {
        $set: {
          "deliveryReceipts.$[receipt].readAt": readAt
        }
      },
      {
        session,
        arrayFilters: [
          {
            "receipt.user": userId,
            "receipt.readAt": null
          }
        ]
      }
    );

    if (existingReceiptUpdate.matchedCount > 0) {
      return existingReceiptUpdate;
    }

    return Message.updateOne(
      {
        _id: messageId,
        "deliveryReceipts.user": { $ne: userId }
      },
      {
        $push: {
          deliveryReceipts: {
            user: userId,
            deliveredAt: readAt,
            readAt
          }
        }
      },
      { session }
    );
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
