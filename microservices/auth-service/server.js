const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create uploads folder if not exists (for multer before Cloudinary upload)
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// ✅ MONGODB CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gov_schemes";
mongoose.connect(mongoURI)
    .then(() => console.log("✅ Auth Service: MongoDB Connected"))
    .catch(err => console.error("❌ Auth Service: MongoDB Connection Error:", err));

// ✅ IMPORT ROUTES
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ✅ REGISTER ROUTES
// The API Gateway forwards requests starting with /api/auth to this service
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
    res.status(200).send('Auth Service is running');
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Auth Service Error Handler:", err.message);
    if (err.stack) console.error(err.stack);

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error in Auth Service",
    });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on port ${PORT}`);
});
