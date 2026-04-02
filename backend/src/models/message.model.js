import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const fileMetaSchema = new Schema(
  {
    url: String,
    publicId: String,
    size: Number,
    mimeType: String,
    fileName: String,
  },
  { _id: false }
);

const reactionSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const editHistorySchema = new Schema(
  {
    previousContent: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);


const messageSchema = new Schema(
  {
    /* Conversation Reference */
    conversation: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    /* Sender */
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* Optional receiver (1:1 optimization) */
    receiver: {
      type: Types.ObjectId,
      ref: "User",
    },

    /* ================= ENCRYPTION ================= */

    encryptedContent: {
      type: String,
      required: function () {
        return !this.isDeletedForEveryone;
      },
    },

    nonce: {
      type: String,
      required: function () {
        return !this.isDeletedForEveryone;
      },
    },

    signature: String,

    isEncrypted: {
      type: Boolean,
      default: true,
    },

    /* ================= MESSAGE TYPE ================= */

    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },

    fileMeta: fileMetaSchema,

    /* ================= THREADING ================= */

    replyTo: {
      type: Types.ObjectId,
      ref: "Message",
    },

    forwardedFrom: {
      type: Types.ObjectId,
      ref: "Message",
    },

    /* ================= REACTIONS ================= */

    reactions: [reactionSchema],

    /* ================= DELIVERY STATUS ================= */

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    deliveredAt: Date,
    readAt: Date,

    /* ================= DISAPPEARING MESSAGE ================= */

    expiresAt: Date,

    /* ================= IDEMPOTENCY ================= */

    clientMessageId: {
      type: String,
      required: true,
      unique: true,
    },

    /* ================= DELETE & MODERATION ================= */

    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deleteForEveryoneAt: Date,

    /* Soft delete per user */
    deletedFor: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],

    /* ================= EDIT SUPPORT ================= */

    editHistory: [editHistorySchema],
    editedAt: Date,

    /* ================= DEVICE TRACKING ================= */

    senderDeviceId: String,
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   PRODUCTION INDEXES
========================================================= */

/* 🔥 Primary chat pagination index (most important) */
messageSchema.index({ conversation: 1, createdAt: -1 });

/* 🔥 Sender activity tracking */
messageSchema.index({ sender: 1, createdAt: -1 });

/* 🔥 Fast unread lookup */
messageSchema.index({ receiver: 1, status: 1 });

/* 🔥 Soft delete optimization */
messageSchema.index({ isDeletedForEveryone: 1 });

/* 🔥 TTL for disappearing messages */
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* 🔥 Reaction lookup optimization */
messageSchema.index({ _id: 1, "reactions.user": 1 });


messageSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});


export default mongoose.model("Message", messageSchema);