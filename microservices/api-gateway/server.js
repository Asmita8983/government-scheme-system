const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// Rate Limiting to prevent DDoS/Abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Service Routes Configuration
const services = {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    schemeService: process.env.SCHEME_SERVICE_URL || 'http://localhost:5002',
    pdfService: process.env.PDF_SERVICE_URL || 'http://localhost:5003', // Now Interaction Service
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5004',
};

// Route Proxies
// All requests to /api/auth/* are routed to the Auth Service
app.use('/api/auth', createProxyMiddleware({
    target: services.authService,
    changeOrigin: true,
    pathRewrite: (path, req) => '/api/auth' + path,
}));

// Route /api/admin to Auth Service (since admin controllers handle login & users)
app.use('/api/admin', createProxyMiddleware({
    target: services.authService,
    changeOrigin: true,
    pathRewrite: (path, req) => '/api/admin' + path,
}));

// All requests to /api/schemes/* are routed to Scheme Management Service
app.use('/api/schemes', createProxyMiddleware({
    target: services.schemeService,
    changeOrigin: true,
    pathRewrite: (path, req) => '/api/schemes' + path,
}));

// Route /api/chat to Interaction Service
app.use('/api/chat', createProxyMiddleware({
    target: services.pdfService, // pointing to 5003 where Interaction Service is mapped
    changeOrigin: true,
    pathRewrite: (path, req) => '/api/chat' + path,
}));

// Route /api/documents to Interaction Service
app.use('/api/documents', createProxyMiddleware({
    target: services.pdfService,
    changeOrigin: true,
    pathRewrite: (path, req) => '/api/documents' + path,
}));

// Route /api/analytics to Analytics Service
app.use('/api/analytics', createProxyMiddleware({
    target: services.analyticsService,
    changeOrigin: true,
    pathRewrite: (path, req) => '/api/analytics' + path,
}));

// Fallback Route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'API Gateway is running. Route /api/* requests to specific microservices.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Gateway Error: Unable to route request.' });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
});
