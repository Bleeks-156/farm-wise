const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-secret-key-2024';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Separate multer config for documents (accepts images and PDFs)
const documentUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'), false);
    }
  }
});

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Upload file to Cloudinary
const uploadToCloudinary = (buffer, folder, opts = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOpts = {
      folder: `farmwise/${folder}`,
      resource_type: opts.resourceType || 'image',
    };
    // Only apply image transformations for non-document image uploads
    if (uploadOpts.resource_type === 'image' && !opts.isDocument) {
      uploadOpts.transformation = [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' }
      ];
    }
    // Preserve original filename so Cloudinary URL has the correct extension
    if (opts.originalFilename) {
      uploadOpts.public_id = opts.originalFilename;
      uploadOpts.use_filename = true;
      uploadOpts.unique_filename = true;
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOpts,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// POST /api/upload/profile - Upload profile photo
router.post('/profile', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    console.log('Uploading file:', req.file.originalname, 'Size:', req.file.size);

    let result;
    try {
      result = await uploadToCloudinary(req.file.buffer, 'profiles');
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload to cloud storage', details: uploadError.message });
    }

    // Update user's profile photo
    req.user.profilePhoto = result.secure_url;
    await req.user.save();

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      url: result.secure_url,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        location: req.user.location,
        profilePhoto: req.user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

// POST /api/upload/product - Upload product image
router.post('/product', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'products');

    res.json({
      success: true,
      message: 'Product image uploaded successfully',
      url: result.secure_url
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

// POST /api/upload/seller - Upload seller image
router.post('/seller', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'sellers');

    res.json({
      success: true,
      message: 'Seller image uploaded successfully',
      url: result.secure_url
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});
// POST /api/upload/document - Upload seller verification document (Aadhaar, PAN, License, Bank)
router.post('/document', authenticate, documentUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document file provided' });
    }

    const validTypes = ['aadhaar', 'pan', 'businessLicense', 'bankAccount'];
    const docType = req.body.docType;

    if (!docType || !validTypes.includes(docType)) {
      return res.status(400).json({ success: false, error: 'Invalid document type. Must be one of: ' + validTypes.join(', ') });
    }

    // Extract file extension from original filename to preserve it in URL
    const path = require('path');
    const ext = path.extname(req.file.originalname);
    const baseName = path.basename(req.file.originalname, ext);
    const safeFilename = `${docType}_${Date.now()}_${baseName}${ext}`;

    // Determine resource type based on file mimetype
    const isPdf = req.file.mimetype === 'application/pdf';
    const result = await uploadToCloudinary(req.file.buffer, `seller-documents/${docType}`, {
      resourceType: isPdf ? 'raw' : 'image',
      isDocument: true,
      originalFilename: safeFilename,
    });

    res.json({
      success: true,
      message: `${docType} document uploaded successfully`,
      url: result.secure_url,
      docType
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

module.exports = router;
