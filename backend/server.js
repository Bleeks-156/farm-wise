// server.js - Main backend server file for FarmWise
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
const advisoryRoutes = require('./routes/advisory');
app.use('/api/advisory', advisoryRoutes);

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FarmWise backend server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🤖 Gemini API integrated and ready`);
});

module.exports = app;