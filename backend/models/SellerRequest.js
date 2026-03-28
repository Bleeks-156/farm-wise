const mongoose = require('mongoose');

const sellerRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Seeds', 'Fertilizers', 'Pesticides', 'Tools', 'Equipment', 'Organic', 'All']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },

  // ── Government Verification Documents ──

  // Aadhaar Card (12-digit UID)
  aadhaarNumber: {
    type: String,
    required: [true, 'Aadhaar number is required'],
    trim: true,
    match: [/^\d{4}\s?\d{4}\s?\d{4}$/, 'Please enter a valid 12-digit Aadhaar number']
  },
  aadhaarDocument: {
    type: String,
    required: [true, 'Aadhaar card document is required'],
    default: ''
  },

  // PAN Card (10-character alphanumeric)
  panNumber: {
    type: String,
    required: [true, 'PAN number is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}\d{4}[A-Z]$/, 'Please enter a valid PAN number (e.g. ABCDE1234F)']
  },
  panDocument: {
    type: String,
    required: [true, 'PAN card document is required'],
    default: ''
  },

  // GST Registration Number (15-character)
  gstNumber: {
    type: String,
    required: [true, 'GST number is required'],
    trim: true,
    uppercase: true,
    match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/, 'Please enter a valid 15-digit GSTIN']
  },

  // Business / Trade License
  businessLicenseNumber: {
    type: String,
    trim: true,
    default: ''
  },
  businessLicenseDocument: {
    type: String,
    default: ''
  },

  // Bank Account Verification (cancelled cheque / passbook)
  bankAccountDocument: {
    type: String,
    default: ''
  },

  // Verification status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SellerRequest', sellerRequestSchema);
