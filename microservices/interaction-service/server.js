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
app.use('/uploads', express.static(uploadsDir));

// ✅ MONGODB CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gov_schemes";
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("✅ Interaction Service: MongoDB Connected"))
    .catch(err => console.error("❌ Interaction Service: MongoDB Connection Error:", err));

// ✅ IMPORT ROUTES
const chatRoutes = require('./routes/chatRoutes');
const docRoutes = require('./routes/docRoutes');

// ✅ REGISTER ROUTES
// API Gateway routes /api/chat and /api/documents to this service
app.use('/api/chat', chatRoutes);
app.use('/api/documents', docRoutes);

app.get('/health', (req, res) => {
    res.status(200).send('Interaction Service is running');
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Interaction Service Error Handler:", err.message);
    if (err.stack) console.error(err.stack);

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error in Interaction Service",
    });
});

const PORT = 5003;
const server = app.listen(PORT, () => {
    console.log(`🚀 Interaction Service running on port ${PORT}`);
});

server.timeout = 120000;
