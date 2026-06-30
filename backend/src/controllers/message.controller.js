import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import MessageService from "../services/message.service.js";
import { getIO } from "../socket/socket.server.js";


//SEND MESSAGE

export const sendMessage = asyncHandler(async (req, res) => {

  const { conversationId } = req.body;

  if (!conversationId ||
      !mongoose.Types.ObjectId.isValid(conversationId)) {

    return res.status(400).json({
      status: "fail",
      message: "Valid conversationId required"
    });

  }

  const result =
    await MessageService.sendMessage(
      req.user._id,
      req.body
    );

  const message = result.message || result;

  try {
    const io = getIO();
    const senderId = req.user._id;
    const recipientIds = result.recipientIds || [];

    if (result.conversationType === "private") {
      io.to(`user:${result.receiverId}`).emit("message:new", message);
      io.to(`user:${senderId}`).emit("message:new", message);
    } else {
      io.to(message.conversation.toString()).emit("message:new", message);
    }

    const onlineRecipientIds = [];

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        const sockets =
          await io.in(`user:${recipientId}`).allSockets();

        if (sockets.size > 0) {
          onlineRecipientIds.push(recipientId);
        }
      })
    );

    const deliveredMessages =
      await Promise.all(
        onlineRecipientIds.map(recipientId =>
          MessageService.markAsDelivered(
            message._id,
            recipientId
          )
        )
      );

    deliveredMessages.forEach((deliveredMessage) => {
      io.to(message.conversation.toString()).emit("message:delivered", {
        message: deliveredMessage
      });
    });
  } catch (err) {
    console.warn("Failed to emit message socket events in sendMessage controller:", err.message);
  }

  res.status(201).json({
    status: "success",
    data: message
  });

});



//GET MESSAGES


export const getMessages = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;
  const { cursor, limit } = req.query;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid conversationId"
    });
  }

  const messages =
      await MessageService.getMessages(
      req.user._id,
      conversationId,
      cursor,
      parseInt(limit) || 20
    );

  res.json({
    status: "success",
    results: messages.length,
    data: messages
  });

});


//EDIT MESSAGE


export const editMessage = asyncHandler(async (req, res) => {

  const { messageId } = req.params;
  const { encryptedContent, nonce } = req.body;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid messageId"
    });
  }

  const message =
    await MessageService.editMessage(
      messageId,
      req.user._id,
      encryptedContent,
      nonce
    );

  res.json({
    status: "success",
    data: message
  });

});



//MARK AS READ


export const markAsRead = asyncHandler(async (req, res) => {

  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid conversationId"
    });
  }

  const updatedMessages =
    await MessageService.markAsRead(
      conversationId,
      req.user._id
    );

  try {
    const io = getIO();
    updatedMessages.forEach(message => {
      io.to(conversationId).emit("message:read", {
        message
      });
    });
  } catch (err) {
    console.warn("Failed to emit message:read socket events in markAsRead controller:", err.message);
  }

  res.json({
    status: "success",
    data: updatedMessages
  });

});



//DELETE FOR ME


export const deleteForMe = asyncHandler(async (req, res) => {

  await MessageService.deleteForMe(
    req.params.messageId,
    req.user._id
  );

  res.json({ status: "success" });

});


//DELETE FOR EVERYONE


export const deleteForEveryone = asyncHandler(async (req, res) => {

  const message =
    await MessageService.deleteForEveryone(
      req.params.messageId,
      req.user._id
    );

  res.json({
    status: "success",
    data: message
  });

});
