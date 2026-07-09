import mongoose from "mongoose";
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
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const existingReceiptUpdate = await Message.updateOne(
      {
        _id: messageId,
        "deliveryReceipts.user": userObjectId
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
            "receipt.user": userObjectId,
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
        "deliveryReceipts.user": { $ne: userObjectId }
      },
      {
        $push: {
          deliveryReceipts: {
            user: userObjectId,
            deliveredAt
          }
        }
      },
      { session }
    );
  }

  static async markReceiptRead(messageId, userId, readAt, session = null) {
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const existingReceiptUpdate = await Message.updateOne(
      {
        _id: messageId,
        "deliveryReceipts.user": userObjectId
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
            "receipt.user": userObjectId,
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
        "deliveryReceipts.user": { $ne: userObjectId }
      },
      {
        $push: {
          deliveryReceipts: {
            user: userObjectId,
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

  const query = {
    conversation: conversationId
  };

  if (cursor) {
    query._id = {
      $lt: cursor
    };
  }

  const messages = await Message.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  const oldestMessage = messages[messages.length - 1];

  let hasMore = false;

  if (oldestMessage) {
    hasMore = await Message.exists({
      conversation: conversationId,
      _id: {
        $lt: oldestMessage._id
      }
    });
  }

  return {
    messages,
    nextCursor: oldestMessage?._id ?? null,
    hasMore: Boolean(hasMore)
  };
}

}

export default MessageRepository;
