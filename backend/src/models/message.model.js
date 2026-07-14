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
  { 
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
  const encryptedPayloadSchema = new Schema(
    {
      recipientUser: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },

      recipientDeviceId: {
        type: String,
        required: true,
      },

      encryptedContent: {
        type: String,
        required: true,
      },

      nonce: {
        type: String,
        required: true,
      },
    },
    { _id: false }
  );
 

    const receiptSchema = new Schema(
      {
        user: {
          type: Types.ObjectId,
          ref: "User",
          required: true,
        },

        deliveredAt: Date,

        readAt: Date,
      },
      { _id: false }
    );

  editHistorySchema.virtual("oldContent")
    .get(function () {
      return this.previousContent;
    })
    .set(function (val) {
      this.previousContent = val;
    });


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

      /*
      * Legacy single-device encryption.
      * Kept temporarily for backward compatibility while
      * migrating to multi-device encryption.
      */
      encryptedContent: {
        type: String,
        required: function () {
          return (
            !this.isDeletedForEveryone &&
            (!this.encryptedPayloads || this.encryptedPayloads.length === 0)
          );
        },
      },

      nonce: {
        type: String,
        required: function () {
          return (
            !this.isDeletedForEveryone &&
            (!this.encryptedPayloads || this.encryptedPayloads.length === 0)
          );
        },
      },

      /*
      * Multi-device encrypted payloads.
      * One payload per recipient device.
      */
      encryptedPayloads: {
        type: [encryptedPayloadSchema],
        default: [],
      },

      signature: String,

      isEncrypted: {
        type: Boolean,
        default: true,
      },

    //msg typ

    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },

    fileMeta: fileMetaSchema,

    //reply forward

    replyTo: {
      type: Types.ObjectId,
      ref: "Message",
    },

    forwardedFrom: {
      type: Types.ObjectId,
      ref: "Message",
    },

    //reactions

    reactions: [reactionSchema],

    //delivery/read receipts

// Delivery / Read receipts (per recipient)

    deliveryReceipts: {
      type: [receiptSchema],
      default: [],
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    starredBy: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],



    //disappearing messages

    expiresAt: Date,

    //offline device

    clientMessageId: {
      type: String,
      required: true,
      unique: true,
    },

    //soft delete for everyone

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

    //edit history

    editHistory: [editHistorySchema],
    editedAt: Date,

    isEdited: {
      type: Boolean,
      default: false,
    },

    //sender device tracking for push notifications

    senderDeviceId: String,
  },
  {
    timestamps: true,
  }
);



messageSchema.index({
  conversation: 1,
  createdAt: -1
});

messageSchema.index({
  sender: 1,
  createdAt: -1
});

messageSchema.index({
    receiver: 1,
    createdAt: -1
});
messageSchema.index({
  "encryptedPayloads.recipientDeviceId": 1
});

messageSchema.index({
  "deliveryReceipts.user": 1
});

messageSchema.index({
  isDeletedForEveryone: 1
});

messageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

messageSchema.index({
  _id: 1,
  "reactions.user": 1
});


messageSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});


export default mongoose.model("Message", messageSchema);
