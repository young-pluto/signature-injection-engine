const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const pdfRoutes = require("./src/routes/pdf.routes");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      /\.vercel\.app$/, // Allow all Vercel subdomains (e.g. signature-injection-engine-*.vercel.app)
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Routes
app.use("/api", pdfRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Signature Engine API is running" });
});

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/signature-engine";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📄 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    console.log("⚠️  Starting server without MongoDB (audit trail disabled)");

    // Start server even without MongoDB
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (MongoDB disabled)`);
    });
  });

module.exports = app;
