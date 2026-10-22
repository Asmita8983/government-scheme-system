const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MONGODB CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gov_schemes";
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("✅ Analytics Service: MongoDB Connected"))
    .catch(err => console.error("❌ Analytics Service: MongoDB Connection Error:", err));

// ✅ IMPORT ROUTES
const analyticsRoutes = require('./routes/analyticsRoutes');

// ✅ REGISTER ROUTES
// API Gateway routes /api/analytics to this service
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
    res.status(200).send('Analytics Service is running');
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Analytics Service Error Handler:", err.message);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error in Analytics Service",
    });
});

const PORT = 5004;
app.listen(PORT, () => {
    console.log(`🚀 Analytics Service running on port ${PORT}`);
});
