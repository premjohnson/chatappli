import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const liveblockSchema = new Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    type: {
      type: String,
      enum: ["checklist", "poll"],
      required: true,
    },
    state: {
      type: Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 0,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
liveblockSchema.index({ conversationId: 1 });

export default mongoose.model("LiveBlock", liveblockSchema);
