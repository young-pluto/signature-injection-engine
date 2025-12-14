const express = require("express");
const multer = require("multer");
const { signPDF, savePDF } = require("../services/pdfService");
const { calculateHash, saveAuditTrail } = require("../services/auditService");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDF
    fieldSize: 50 * 1024 * 1024, // 50MB limit for JSON fields (Base64 images)
  },
});

/**
 * POST /api/sign-pdf
 *
 * Request body:
 * - pdfFile: PDF file (multipart/form-data)
 * - fields: JSON string of field array
 * - viewport: JSON string of viewport dimensions
 *
 * Response:
 * - signedPdfUrl: URL to download signed PDF
 * - auditTrail: Audit trail document
 */
router.post("/sign-pdf", upload.single("pdfFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    // Parse request data
    const fields = JSON.parse(req.body.fields || "[]");
    const viewport = JSON.parse(
      req.body.viewport || '{"width": 800, "height": 600}'
    );

    // Calculate hash of original PDF
    const originalHash = calculateHash(req.file.buffer);

    // Sign the PDF
    const signedPdfBuffer = await signPDF(req.file.buffer, fields, viewport);

    // Calculate hash of signed PDF
    const signedHash = calculateHash(signedPdfBuffer);

    // Save signed PDF
    const timestamp = Date.now();
    const signedFileName = `signed_${timestamp}.pdf`;
    await savePDF(signedPdfBuffer, signedFileName);

    // Try to save audit trail to MongoDB (optional - won't fail if MongoDB is unavailable)
    let auditTrail = null;
    try {
      auditTrail = await saveAuditTrail(originalHash, signedHash, {
        originalFileName: req.file.originalname,
        signedFileName,
        signatureCount: fields.filter((f) => f.type === "signature").length,
        fieldTypes: [...new Set(fields.map((f) => f.type))],
      });
    } catch (auditError) {
      console.warn(
        "Audit trail save failed (MongoDB unavailable):",
        auditError.message
      );
    }

    // Return response
    res.json({
      success: true,
      signedPdfUrl: `/api/download/${signedFileName}`,
      auditTrail: auditTrail
        ? {
            originalHash,
            signedHash,
            timestamp: auditTrail.createdAt,
          }
        : {
            originalHash,
            signedHash,
            timestamp: new Date(),
            note: "Audit trail not saved (MongoDB unavailable)",
          },
    });
  } catch (error) {
    console.error("Error in /sign-pdf:", error);
    res.status(500).json({
      error: "Failed to sign PDF",
      message: error.message,
    });
  }
});

/**
 * GET /api/download/:filename
 * Download signed PDF
 */
router.get("/download/:filename", async (req, res) => {
  try {
    const path = require("path");
    const fs = require("fs");

    console.log(`[Download] Requested filename: ${req.params.filename}`);

    // Resolve absolute path
    const uploadsDir = path.resolve(__dirname, "../../uploads");
    const filePath = path.join(uploadsDir, req.params.filename);

    console.log(`[Download] Resolved uploads dir: ${uploadsDir}`);
    console.log(`[Download] Resolved file path: ${filePath}`);

    // Check if file exists manually before sending
    if (!fs.existsSync(filePath)) {
      console.error(`[Download] File does NOT exist at path: ${filePath}`);
      // List directory contents to see what's there
      const files = fs.readdirSync(uploadsDir);
      console.log(`[Download] Directory contents:`, files);
      return res.status(404).json({ error: "File not found on disk" });
    }

    console.log(`[Download] File exists, sending via stream...`);

    // Manual streaming to bypass Express/send module issues
    res.setHeader(
      "Content-DISPOSITION",
      `attachment; filename="${req.params.filename}"`
    );
    res.setHeader("Content-Type", "application/pdf");

    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (err) => {
      console.error("[Download] Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream file" });
      }
    });

    fileStream.on("open", () => {
      console.log("[Download] Stream opened, piping to response");
      fileStream.pipe(res);
    });

    fileStream.on("end", () => {
      console.log("[Download] Stream finished");
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

module.exports = router;
