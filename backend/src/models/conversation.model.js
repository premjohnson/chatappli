import mongoose from 'mongoose';

const { Schema, Types } = mongoose;



const participantSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true
    },

    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },

    joinedAt: {
      type: Date,
      default: Date.now
    },

    isArchived: {
      type: Boolean,
      default: false
    },

    isMuted: {
      type: Boolean,
      default: false
    },

    unreadCount: {
      type: Number,
      default: 0
    },

    lastReadAt: Date
  },
  { _id: false }
);
const groupAvatarSchema = new Schema(
  {
    publicId: String,
    url: String
  },
  { _id: false }
);
const groupSettingsSchema = new Schema(
  {
    onlyAdminsCanSend: {
      type: Boolean,
      default: false
    },

    onlyAdminsCanAddMembers: {
      type: Boolean,
      default: true
    },

    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);
const conversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      default: 'private',
      index: true
    },
    privateKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    participants: {
      type: [participantSchema],
      validate: [
        {
          validator: function (value) {
            if (this.type === 'private') return value.length === 2;
            if (this.type === 'group') return value.length >= 2;
            return false;
          },
          message: 'Invalid participant count'
        },
        {
          validator: function (value) {
            // Check for duplicate user IDs in participants
            const userIds = value.map(p => p.user.toString());
            const uniqueIds = new Set(userIds);
            return userIds.length === uniqueIds.size;
          },
          message: 'Duplicate users in participants array'
        }
      ]
    },
    groupName: {
      type: String,
      trim: true
    },

    groupAbout: {
      type: String,
      trim: true
    },

    groupAvatar: groupAvatarSchema,

    groupSettings: groupSettingsSchema,

    createdBy: {
      type: Types.ObjectId,
      ref: 'User'
    },
//last msg preview

    lastMessage: {
      type: Types.ObjectId,
      ref: 'Message'
    },

    lastMessageAt: {
      type: Date,
      index: true
    },

    //encryption 

    encryptionMeta: {
      sharedKeyId: String,
      algorithm: {
        type: String,
        default: 'nacl-box'
      }
    },

    //moderation

    deletedFor: [
      {
        type: Types.ObjectId,
        ref: 'User'
      }
    ],

    isBlocked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

//indexes

conversationSchema.index({ 'participants.user': 1, lastMessageAt: -1 });

conversationSchema.index({ lastMessageAt: -1 });

conversationSchema.index(
  { privateKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: 'private'
    }
  }
);


conversationSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Conversation', conversationSchema);