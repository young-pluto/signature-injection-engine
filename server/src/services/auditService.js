const crypto = require("crypto");
const Document = require("../models/Document.model");

/**
 * Calculate SHA-256 hash of a PDF buffer
 */
function calculateHash(pdfBuffer) {
  return crypto.createHash("sha256").update(pdfBuffer).digest("hex");
}

/**
 * Save audit trail to MongoDB
 */
async function saveAuditTrail(originalHash, signedHash, metadata) {
  try {
    const document = new Document({
      originalHash,
      signedHash,
      originalFileName: metadata.originalFileName,
      signedFileName: metadata.signedFileName,
      metadata: {
        signedAt: new Date(),
        signatureCount: metadata.signatureCount || 1,
        fieldTypes: metadata.fieldTypes || [],
      },
    });

    await document.save();
    return document;
  } catch (error) {
    console.error("Error saving audit trail:", error);
    throw error;
  }
}

module.exports = {
  calculateHash,
  saveAuditTrail,
};
