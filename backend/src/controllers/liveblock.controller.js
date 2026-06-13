import asyncHandler from "../utils/asyncHandler.js";
import LiveBlockService from "../services/liveblock.service.js";
import ConversationRepository from "../repositories/conversation.repository.js";
import { createLiveBlockSchema } from "../socket/validators/liveblock.validator.js";
import AppError from "../utils/appError.js";
import { ERROR_CODES } from "../utils/errorConstants.js";
import mongoose from "mongoose";

/**
 * REST endpoint to create a LiveBlock widget
 */
export const createLiveBlock = asyncHandler(async (req, res) => {
  // 1. Zod input check
  const { conversationId, type, state } = createLiveBlockSchema.parse(req.body);

  // 2. Authorization check (User must be a participant of the target conversation)
  const conversation = await ConversationRepository.findById(conversationId);
  if (!conversation) {
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);
  }

  const isParticipant = conversation.participants.some((p) =>
    p.user.equals(req.user._id)
  );
  if (!isParticipant) {
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);
  }

  const block = await LiveBlockService.createLiveBlock(conversationId, type, state);

  res.status(201).json({
    status: "success",
    data: block,
  });
});

/**
 * REST endpoint to fetch a LiveBlock state (Cache-aside)
 */
export const getLiveBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(blockId)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, "Invalid blockId");
  }

  // Retrieve block
  const block = await LiveBlockService.getLiveBlock(blockId);
  if (!block) {
    throw new AppError(ERROR_CODES.LIVEBLOCK_NOT_FOUND, 404);
  }

  // Authorization check (User must be a participant of the block's conversation)
  const conversation = await ConversationRepository.findById(block.conversationId);
  if (!conversation) {
    throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);
  }

  const isParticipant = conversation.participants.some((p) =>
    p.user.equals(req.user._id)
  );
  if (!isParticipant) {
    throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);
  }

  res.status(200).json({
    status: "success",
    data: block,
  });
});
