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

    muteUntil: {
      type: Date
    },

    muteType: {
      type: String,
      enum: ['all', 'mentions'],
      default: 'all'
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

    onlyAdminsCanRemoveMembers: {
      type: Boolean,
      default: true
    },

    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: true
    },

    onlyAdminsCanPinMessages: {
      type: Boolean,
      default: true
    },

    slowModeDelay: {
      type: Number,
      default: 0
    },

    disappearingDuration: {
      type: Number,
      default: 0
    },

    memberApprovalsEnabled: {
      type: Boolean,
      default: false
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
    },

    inviteLinks: [
      {
        code: {
          type: String,
          index: true,
          sparse: true
        },
        createdBy: {
          type: Types.ObjectId,
          ref: 'User'
        },
        expiresAt: Date,
        maxUses: Number,
        usesCount: {
          type: Number,
          default: 0
        },
        isActive: {
          type: Boolean,
          default: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    joinRequests: [
      {
        user: {
          type: Types.ObjectId,
          ref: 'User'
        },
        requestedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    pinnedMessages: [
      {
        message: {
          type: Types.ObjectId,
          ref: 'Message'
        },
        pinnedBy: {
          type: Types.ObjectId,
          ref: 'User'
        },
        pinnedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
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