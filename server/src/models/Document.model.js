const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    originalHash: {
      type: String,
      required: true,
    },
    signedHash: {
      type: String,
      required: true,
    },
    originalFileName: String,
    signedFileName: String,
    metadata: {
      signedAt: {
        type: Date,
        default: Date.now,
      },
      signatureCount: Number,
      fieldTypes: [String],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);
