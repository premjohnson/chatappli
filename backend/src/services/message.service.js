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
        encryptedPayloads = [],
        type = "text",
        fileMeta,
        clientMessageId,
        replyTo,
        forwardedFrom,
        signature,
        senderDeviceId
      } = payload;
      /* Validate encryption payload */

        const hasLegacyPayload =
          Boolean(encryptedContent && nonce);

        if (!Array.isArray(encryptedPayloads)) {
          throw new AppError(
            "encryptedPayloads must be an array",
            400
          );
        }

        const hasMultiDevicePayload =
          encryptedPayloads.length > 0;

        if (!hasLegacyPayload && !hasMultiDevicePayload) {
          throw new AppError(
            "Encrypted payload is required",
            400
          );
        }

        if (hasMultiDevicePayload) {
          const recipientDeviceIds = new Set();

          encryptedPayloads.forEach(payload => {
            if (
              !payload?.recipientUser ||
              !payload?.recipientDeviceId ||
              !payload?.encryptedContent ||
              !payload?.nonce
            ) {
              throw new AppError(
                "Invalid encrypted payload",
                400
              );
            }

            if (recipientDeviceIds.has(payload.recipientDeviceId)) {
              throw new AppError(
                "Duplicate encrypted payload recipient device",
                400
              );
            }

            recipientDeviceIds.add(payload.recipientDeviceId);
          });
        }

        const conversation =
          await ConversationRepository.findById(
            conversationId,
            session
          );

        //*************************never forget this imp to verify *************************************
        // console.log(
        //         "participants:",
        //         JSON.stringify(
        //           conversation.participants,
        //           null,
        //           2
        //         )
        //       );//no need 

      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

        const senderParticipant = conversation.participants.find(
          p => {
            const participantId = p.user._id || p.user;
            return participantId.equals(userId);
          }
        );


      if (!senderParticipant)
        throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

      if (
          conversation.type === "group" &&
          conversation.groupSettings?.onlyAdminsCanSend &&
          !["owner", "admin"].includes(senderParticipant.role)
        ) {
          throw new AppError(
            "Only admins can send messages",
            403
          );
        }

      if (
        conversation.type === "group" &&
        conversation.groupSettings?.slowModeDelay > 0 &&
        !["owner", "admin"].includes(senderParticipant.role)
      ) {
        const slowmodeKey = `slowmode:${conversationId}:${userId}`;
        const lastSentTime = await redis.get(slowmodeKey);
        if (lastSentTime) {
          throw new AppError("Slow mode is active. Please wait.", 429);
        }
        await redis.set(slowmodeKey, Date.now().toString(), "EX", conversation.groupSettings.slowModeDelay);
      }

      const participantUserIds = conversation.participants.map(p => {
        const participantId = p.user._id || p.user;
        return participantId;
      });

      const recipientIds = participantUserIds.filter(
        participantId => !participantId.equals(userId)
      );

      /* detect receiver newly merge part */
        let receiverId = null;

        if (conversation.type === "private") {
          receiverId = recipientIds[0] || null;

          if (!receiverId) {
            throw new AppError(
              ERROR_CODES.RECEIVER_NOT_FOUND,
              404
          );
        }
      }

      if (recipientIds.length === 0) {
        throw new AppError(
          ERROR_CODES.RECEIVER_NOT_FOUND,
          404
        );
      }

      /* idempotency */

      if (clientMessageId) {

        const existing =
          await MessageRepository.findByClientMessageId(
            clientMessageId,
            session
          );

        if (existing) {
          return {
            message: existing,
            conversationType: conversation.type,
            receiverId,
            recipientIds
          };
        }
      }

      // Check disappearing messages
      let expiresAt = undefined;
      if (conversation.groupSettings?.disappearingDuration > 0) {
        expiresAt = new Date(Date.now() + conversation.groupSettings.disappearingDuration * 1000);
      }

      /* create message */
     //i cmt for for few changes becuz for multi device encyption
      const savedMessage =
      await MessageRepository.create({
              conversation: conversationId,
              sender: userId,
              receiver: receiverId,

              // Legacy
              encryptedContent,
              nonce,

              // Multi-device
              encryptedPayloads,

              deliveryReceipts: recipientIds.map(recipientId => ({
                user: recipientId
              })),

              type,
              fileMeta,
              replyTo,
              forwardedFrom,
              signature,
              senderDeviceId,
              clientMessageId,
              expiresAt
            }, session);


      /* update conversation metadata */

      // conversation.lastMessage = savedMessage._id;
      // conversation.lastMessageAt = savedMessage.createdAt;

      // await ConversationRepository.save(conversation, session);

      // await mongoose.model("Conversation").updateOne(
      //   { 
      //     _id: conversationId,
      //     "participants.user": receiverId 
      //   },
      //   { 
      //     $inc: { "participants.$.unreadCount": 1 } 
      //   }
      // ).session(session);

      // /* Redis cache */

      // if (redis?.isOpen) {

      //   const redisKey = `chat:${conversationId}`;

      //   await redis.rPush(redisKey, JSON.stringify(savedMessage));
      //   await redis.lTrim(redisKey, -100, -1);
      // }
      /* update conversation metadata */
        //for safty reason still group chat not implimented 
        conversation.lastMessage = savedMessage._id;
        conversation.lastMessageAt = savedMessage.createdAt;

        await ConversationRepository.save(conversation, session);

        if (recipientIds.length > 0) {

          await mongoose.model("Conversation").updateOne(
            {
              _id: conversationId,
              "participants.user": { $in: recipientIds }
            },
            {
              $inc: {
                "participants.$[recipient].unreadCount": 1
              }
            },
            {
              arrayFilters: [
                {
                  "recipient.user": { $in: recipientIds }
                }
              ]
            }
          ).session(session);

        }

        /* Redis cache */

        if (redis?.isOpen) {

          const redisKey = `chat:${conversationId}`;

          await redis.rPush(redisKey, JSON.stringify(savedMessage));
          await redis.lTrim(redisKey, -100, -1);
        }
      //now it return's type of convo we can impli socket handler for group chat
      return{
        message: savedMessage,
        conversationType: conversation.type,
        receiverId,
        recipientIds
      };

    });

  }

//get messages in a conversation with pagination (cursor-based)

static async getMessages(
  userId,
  conversationId,
  cursor = null,
  limit = 20
) {

  const conversation =
    await ConversationRepository.findById(
      conversationId
    );

  if (!conversation) {
    throw new AppError(
      ERROR_CODES.CONVERSATION_NOT_FOUND,
      404
    );
  }

  const isParticipant =
    conversation.participants.some((p) => {
      const participantId = p.user._id || p.user;
      return participantId.equals(userId);
    });

  if (!isParticipant) {
    throw new AppError(
      ERROR_CODES.NOT_PARTICIPANT,
      403
    );
  }

  const redis = getRedisClient();
  const redisKey = `chat:${conversationId}`;

  // First page from Redis
  if (!cursor && redis?.isOpen) {

    const cached =
      await redis.lRange(
        redisKey,
        -limit,
        -1
      );

    if (cached.length > 0) {

      const messages =
        cached.map((m) => JSON.parse(m));

      const oldestMessage =
        messages[0];

      const hasMore =
        await Message.exists({
          conversation: conversationId,
          _id: {
            $lt: oldestMessage._id
          }
        });

      return {
        messages,
        nextCursor: oldestMessage?._id ?? null,
        hasMore: Boolean(hasMore)
      };

    }
  }

  const result =
    await MessageRepository.findMessages(
      conversationId,
      cursor,
      limit
    );

  return {
    messages: result.messages.reverse(),
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  };

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

    // Clear Redis cache to maintain consistency
    try {
      const redis = getRedisClient();
      if (redis?.isOpen) {
        await redis.del(`chat:${updatedMessage.conversation}`);
      }
    } catch (err) {
      logger.warn(`Failed to clear Redis cache in editMessage: ${err.message}`);
    }

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
      throw new AppError(ERROR_CODES.NOT_FOUND, 404);

    const conversation =
      await ConversationRepository.findById(message.conversation);

    if (!conversation) {
      throw new AppError(
        ERROR_CODES.CONVERSATION_NOT_FOUND,
        404
      );
    }

    const isParticipant =
      conversation.participants.some(p => {
        const participantId = p.user._id || p.user;
        return participantId.equals(userId);
      });

    if (!isParticipant) {
      throw new AppError(
        ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }

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
      throw new AppError(ERROR_CODES.NOT_FOUND, 404);

    const conversation =
      await ConversationRepository.findById(message.conversation);

    if (!conversation) {
      throw new AppError(
        ERROR_CODES.CONVERSATION_NOT_FOUND,
        404
      );
    }

    const isParticipant =
      conversation.participants.some(p => {
        const participantId = p.user._id || p.user;
        return participantId.equals(userId);
      });

    if (!isParticipant) {
      throw new AppError(
        ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }

    if (!message.sender.equals(userId))
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 403);

    const DELETE_WINDOW_MS = 15 * 60 * 1000;

    if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS)
      throw new AppError(ERROR_CODES.WINDOW_EXPIRED, 400);

    message.isDeletedForEveryone = true;
    message.deleteForEveryoneAt = new Date();

    message.encryptedContent = null;
    message.nonce = null;
    message.encryptedPayloads = [];
    message.fileMeta = undefined;

    message.type = "system";
    message.editedAt = new Date();

    const savedMessage = await MessageRepository.save(message);

    // Clear Redis cache to maintain consistency
    try {
      const redis = getRedisClient();
      if (redis?.isOpen) {
        await redis.del(`chat:${savedMessage.conversation}`);
      }
    } catch (err) {
      logger.warn(`Failed to clear Redis cache in deleteForEveryone: ${err.message}`);
    }

    return savedMessage;

  }

//marks as delivered msg

  static async markAsDelivered(messageId, userId) {

    const message =
      await MessageRepository.findById(messageId);

    if (!message)
      throw new AppError(ERROR_CODES.NOT_FOUND, 404);

    const conversation =
      await ConversationRepository.findById(message.conversation);

    if (!conversation)
      throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

    const isParticipant =
      conversation.participants.some(p => {
        const participantId = p.user._id || p.user;
        return participantId.equals(userId);
      });

    if (!isParticipant)
      throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

    if (message.sender.equals(userId))
      return message;

    const now = new Date();

    await MessageRepository.markReceiptDelivered(
      messageId,
      userId,
      now
    );

    const updatedMessage =
      await MessageRepository.findById(messageId);

    try {
      const redis = getRedisClient();

      if (redis?.isOpen) {
        await redis.del(`chat:${message.conversation}`);
      }
    } catch (err) {
      logger.warn(
        `Failed to clear Redis cache in markAsDelivered: ${err.message}`
      );
    }

    return updatedMessage;

  }

//marks as read msg

  static async markAsRead(conversationId, userId) {

    return TransactionManager.run(async (session) => {

      const conversation =
        await ConversationRepository.findById(
          conversationId,
          session
        );

      if (!conversation)
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);

      const participant = conversation.participants.find((p) => {
        const participantId = p.user._id || p.user;
        return participantId.equals(userId);
      });

      if (!participant)
        throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);

      const unreadMessages =
        await MessageRepository.findUnreadMessagesForUser(
          conversationId,
          userId,
          session
        );

      if (unreadMessages.length === 0) {
        participant.unreadCount = 0;
        participant.lastReadAt = new Date();

        await ConversationRepository.save(
          conversation,
          session
        );

        return [];
      }

      const now = new Date();
      const messageIds = unreadMessages.map(message => message._id);

      for (const messageId of messageIds) {
        await MessageRepository.markReceiptRead(
          messageId,
          userId,
          now,
          session
        );
      }

      participant.unreadCount = 0;
      participant.lastReadAt = now;

      await ConversationRepository.save(
        conversation,
        session
      );

      const updatedMessages =
        await Message.find({
          _id: { $in: messageIds }
        }).session(session);

      try {

        const redis = getRedisClient();

        if (redis?.isOpen) {
          await redis.del(`chat:${conversationId}`);
        }

      } catch (err) {

        logger.warn(
          `Failed to clear Redis cache in markAsRead: ${err.message}`
        );

      }

      const participantIds = conversation.participants.map(p => (p.user._id || p.user).toString());
      return { updatedMessages, participantIds };

    });

  }

}

export default MessageService;
