const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

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

// ✅ MONGODB CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gov_schemes";
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("✅ Scheme Service: MongoDB Connected"))
    .catch(err => console.error("❌ Scheme Service: MongoDB Connection Error:", err));

// ✅ IMPORT ROUTES
const schemeRoutes = require('./routes/schemeRoutes');

// ✅ REGISTER ROUTES
// API Gateway routes /api/schemes to this service
app.use('/api/schemes', schemeRoutes);

app.get('/health', (req, res) => {
    res.status(200).send('Scheme Service is running');
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Scheme Service Error Handler:", err.message);
    if (err.stack) console.error(err.stack);

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error in Scheme Service",
    });
});

const PORT = 5002;
const server = app.listen(PORT, () => {
    console.log(`🚀 Scheme Service running on port ${PORT}`);
});

// Increase timeout for large PDF processing
server.timeout = 600000;
server.keepAliveTimeout = 601000;
server.headersTimeout = 602000;
