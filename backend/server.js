const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: true });

// Polyfills for pdf-parse (fixes crashes in Node where browser APIs are expected)
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D { };
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {
    constructor(width, height) { this.width = width; this.height = height; this.data = new Uint8ClampedArray(width * height * 4); }
  };
}


const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// ✅ STATIC FILES - Create uploads folder if not exists
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// ✅ MONGODB CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gov_schemes";
console.log("Connecting to MongoDB at:", mongoURI);

let server;
const { verifyEmailConfiguration } = require("./utils/emailService");

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 30000 // Increased timeout to 30 seconds for heavy local loads
})
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await verifyEmailConfiguration();

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Increase timeout for large PDF processing (10 minutes)
    server.timeout = 600000;
    server.keepAliveTimeout = 601000;
    server.headersTimeout = 602000;
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ✅ IMPORT ROUTES
const schemeRoutes = require("./routes/schemeRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");
const docRoutes = require("./routes/docRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

// ✅ REGISTER ROUTES
app.use("/api/schemes", schemeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", docRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.send("Government Scheme System Backend is running");
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.message);
  if (err.stack) console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Removed explicit app.listen here; it is now inside the MongoDB connect callback above.
