import mongoose from "mongoose";
import { z } from "zod";
import Message from "../models/message.model.js";
import MessageRepository from "../repositories/message.repository.js";
import ConversationRepository from "../repositories/conversation.repository.js";
import TransactionManager from "../core/transaction.manager.js";
import { getRedisClient } from "../config/redis.js";
import AppError from "../utils/appError.js";
import { ERROR_CODES } from "../utils/errorConstants.js";
import logger from "../config/logger.js";

class MessageService {

//send message in a conversation

  static async sendMessage(userId, payload) {

    const redis = getRedisClient();

    return TransactionManager.run(async (session) => {

      const {
        conversationId,
        encryptedContent,
        nonce,
        type = "text",
        fileMeta,
        clientMessageId,
        replyTo,
        forwardedFrom,
        signature,
        senderDeviceId
      } = payload;

      const conversation =
        await ConversationRepository.findById(conversationId, session);

      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const senderParticipant = conversation.participants.find(
        p => p.user.equals(userId)
      );

      if (!senderParticipant)
        throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

      /* detect receiver */

      const receiverParticipant = conversation.participants.find(
        p => !p.user.equals(userId)
      );

      const receiverId = receiverParticipant?.user;

      if (!receiverId)
        throw new AppError(ERROR_CODES.RECEIVER_NOT_FOUND, 404);

      /* idempotency */

      if (clientMessageId) {

        const existing =
          await MessageRepository.findByClientMessageId(
            clientMessageId,
            session
          );

        if (existing) return existing;
      }

      /* create message */

      const savedMessage =
        await MessageRepository.create({
          conversation: conversationId,
          sender: userId,
          receiver: receiverId,
          encryptedContent,
          nonce,
          type,
          fileMeta,
          replyTo,
          forwardedFrom,
          signature,
          senderDeviceId,
          clientMessageId
        }, session);

      /* update conversation metadata */

      conversation.lastMessage = savedMessage._id;
      conversation.lastMessageAt = savedMessage.createdAt;

      await ConversationRepository.save(conversation, session);

      await mongoose.model("Conversation").updateOne(
        { 
          _id: conversationId,
          "participants.user": receiverId 
        },
        { 
          $inc: { "participants.$.unreadCount": 1 } 
        }
      ).session(session);

      /* Redis cache */

      if (redis?.isOpen) {

        const redisKey = `chat:${conversationId}`;

        await redis.rPush(redisKey, JSON.stringify(savedMessage));
        await redis.lTrim(redisKey, -100, -1);
      }

      return savedMessage;

    });

  }

//get messages in a conversation with pagination (cursor-based)

  static async getMessages(conversationId, cursor = null, limit = 20) {

    const redis = getRedisClient();
    const redisKey = `chat:${conversationId}`;

    if (!cursor && redis?.isOpen) {

      const cached = await redis.lRange(redisKey, -limit, -1);

      if (cached.length > 0) {
        return cached.map(m => JSON.parse(m));
      }
    }

    const messages =
      await MessageRepository.findMessages(
        conversationId,
        cursor,
        limit
      );

    return messages.reverse();

  }

//edit message (only within 15 minutes of sending and only by sender)

  static async editMessage(messageId, userId, encryptedContent, nonce) {

    // 1. Zod input validation
    const editSchema = z.object({
      encryptedContent: z.string().min(1, "Encrypted content is required"),
      nonce: z.string().min(1, "Nonce is required"),
    });

    editSchema.parse({ encryptedContent, nonce });

    const message =
      await MessageRepository.findById(messageId);

    if (!message)
      throw new AppError(ERROR_CODES.NOT_FOUND, 404);

    if (!message.sender.equals(userId))
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

    const EDIT_WINDOW_MS = 15 * 60 * 1000;

    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS)
      throw new AppError(ERROR_CODES.WINDOW_EXPIRED, 400);

    message.editHistory = message.editHistory || [];

    message.editHistory.push({
      previousContent: message.encryptedContent,
      editedAt: new Date()
    });

    // Issue 3: Cap the edit history array to prevent document bloat
    const MAX_EDIT_HISTORY = 10;
    if (message.editHistory.length > MAX_EDIT_HISTORY) {
      message.editHistory.shift();
    }

    message.encryptedContent = encryptedContent;
    message.nonce = nonce;
    message.editedAt = new Date();
    message.isEdited = true;

    const updatedMessage = await MessageRepository.save(message);

    // Broadcast update to all participants in conversation room
    try {
      const { getIO } = await import("../socket/socket.server.js");
      const io = getIO();
      io.to(updatedMessage.conversation.toString()).emit("message:update", updatedMessage);
    } catch (err) {
      logger.warn(`Failed to broadcast message edit: ${err.message}`);
    }

    return updatedMessage;

  }
//delete message for self (soft delete)

  static async deleteForMe(messageId, userId) {

    const message =
      await MessageRepository.findById(messageId);

    if (!message)
      throw new Error("Message not found");

    await MessageRepository.updateOne(
      { _id: messageId },
      { $addToSet: { deletedFor: userId } }
    );

    return true;

  }

//delete message for everyone (only within 15 minutes of sending and only by sender)

  static async deleteForEveryone(messageId, userId) {

    const message =
      await MessageRepository.findById(messageId);

    if (!message)
      throw new Error("Message not found");

    if (!message.sender.equals(userId))
      throw new Error("Unauthorized");

    const DELETE_WINDOW_MS = 15 * 60 * 1000;

    if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS)
      throw new Error("Delete window expired");

    message.isDeletedForEveryone = true;
    message.deleteForEveryoneAt = new Date();

    message.encryptedContent = null;
    message.nonce = null;
    message.fileMeta = undefined;

    message.type = "system";
    message.editedAt = new Date();

    return MessageRepository.save(message);

  }

//marks as read msg

  static async markAsRead(conversationId, userId) {

    return TransactionManager.run(async (session) => {

      const conversation =
        await ConversationRepository.findById(conversationId, session);

      if (!conversation)
        throw new Error("Conversation not found");

      const participant = conversation.participants.find(
        p => p.user.equals(userId)
      );

      if (!participant)
        throw new Error("Not a participant");

      /* find unread messages */

      const unreadMessages = await Message.find({
        conversation: conversationId,
        sender: { $ne: userId },
        status: { $ne: "read" }
      }).session(session);

      if (unreadMessages.length === 0)
        return [];

      /* update status */

      await MessageRepository.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        {
          $set: {
            status: "read",
            readAt: new Date()
          }
        },
        session
      );

      participant.unreadCount = 0;
      participant.lastReadAt = new Date();

      await ConversationRepository.save(conversation, session);

      return unreadMessages;

    });

  }

}

export default MessageService;