import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const avatarSchema = new mongoose.Schema(
  {
    publicId: String,
    url: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: avatarSchema,
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    resetPasswordOtpHash: String,
    resetPasswordOtpExpires: Date,
  },
  { timestamps: true }
);

/* Hash Password */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

/* Compare Password */
userSchema.methods.comparePassword = async function (candidate) {
  return await bcrypt.compare(candidate, this.password);
};

/* Generate OTP */
userSchema.methods.generatePasswordResetOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const hash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  this.resetPasswordOtpHash = hash;
  this.resetPasswordOtpExpires = new Date(
    Date.now() + 10 * 60 * 1000
  );

  return otp;
};

export default mongoose.model("User", userSchema);