// server.js - Main backend server file for FarmWise
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const hpp = require('hpp');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// ──────────────────────────────────────────────
// Security Middleware
// ──────────────────────────────────────────────

// Helmet: sets various HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server (frontend handles its own)
  crossOriginEmbedderPolicy: false,
}));

// HPP: protect against HTTP parameter pollution
app.use(hpp());

// Trust proxy (needed for rate limiter behind reverse proxy / deployment)
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parsing with size limits to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// General rate limiter on all API routes
app.use('/api', generalLimiter);

// ──────────────────────────────────────────────
// MongoDB Connection
// ──────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Advisory routes
const advisoryRoutes = require('./routes/advisory');
app.use('/api/advisory', advisoryRoutes);

// Upload routes
const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);

// Marketplace routes
const marketplaceRoutes = require('./routes/marketplace');
app.use('/api/marketplace', marketplaceRoutes);

// Payment routes
const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);

// Cart routes
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

// Chat history routes
const chatHistoryRoutes = require('./routes/chatHistory');
app.use('/api/chat-history', chatHistoryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FarmWise backend is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'FarmWise API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      advisory: '/api/advisory/chat'
    }
  });
});

// ──────────────────────────────────────────────
// Error Handling
// ──────────────────────────────────────────────

// Error handling middleware — never leak stack traces in production
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong!'
    : err.message;

  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FarmWise backend server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🤖 Gemini API integrated and ready`);
  console.log(`🔒 Security middleware active (Helmet, CORS, Rate Limiting, HPP)`);
});

module.exports = app;