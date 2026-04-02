import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const deviceSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true
    },

    deviceId: {
      type: String,
      required: true
    },

    publicKey: {
      type: String,
      required: true
    },

    identityKey: {
      type: String,
      required: true
    },

    signedPreKey: {
      type: String,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

deviceSchema.index({ user: 1 });
deviceSchema.index({ deviceId: 1 }, { unique: true });

export default mongoose.model('Device', deviceSchema);