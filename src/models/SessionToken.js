import mongoose from 'mongoose';

const sessionTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    deviceName: {
      type: String,
      default: ''
    },
    deviceType: {
      type: String,
      enum: ['web', 'mobile', 'desktop', 'tablet', 'unknown'],
      default: 'unknown'
    },
    ipAddress: {
      type: String,
      default: ''
    },
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

sessionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SessionToken = mongoose.model('SessionToken', sessionTokenSchema);

export default SessionToken;

