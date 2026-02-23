const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const SellerRequest = require('../models/SellerRequest');

const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-secret-key-2024';

// Middleware to verify any authenticated user
const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const User = require('../models/User');
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

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Middleware to verify user is an approved seller
const verifySeller = async (req, res, next) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id, isActive: true });
    if (!seller) {
      return res.status(403).json({ success: false, error: 'You must be an approved seller to perform this action' });
    }
    req.seller = seller;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to verify seller status' });
  }
};

// ============ SELLER REQUEST ROUTES ============

// POST /api/marketplace/seller-request - Submit a request to become a seller
router.post('/seller-request', verifyUser, async (req, res) => {
  try {
    // Check if user is already a seller
    const existingSeller = await Seller.findOne({ user: req.user._id });
    if (existingSeller) {
      return res.status(400).json({ success: false, error: 'You are already a registered seller' });
    }

    // Check if user already has a pending or approved request
    const existingRequest = await SellerRequest.findOne({ user: req.user._id });
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ success: false, error: 'You already have a pending seller request' });
      }
      if (existingRequest.status === 'approved') {
        return res.status(400).json({ success: false, error: 'Your seller request was already approved' });
      }
      // If rejected, allow re-submission by updating the existing request
      existingRequest.shopName = req.body.shopName;
      existingRequest.location = req.body.location;
      existingRequest.category = req.body.category;
      existingRequest.phone = req.body.phone;
      existingRequest.description = req.body.description || '';
      existingRequest.image = req.body.image || '';
      existingRequest.status = 'pending';
      existingRequest.adminNote = '';
      existingRequest.reviewedBy = null;
      existingRequest.reviewedAt = null;
      await existingRequest.save();
      return res.status(200).json({ success: true, message: 'Seller request re-submitted', request: existingRequest });
    }

    const { shopName, location, category, phone, description, image } = req.body;

    if (!shopName || !location || !category || !phone) {
      return res.status(400).json({ success: false, error: 'Shop name, location, category, and phone are required' });
    }

    const sellerRequest = new SellerRequest({
      user: req.user._id,
      shopName,
      location,
      category,
      phone,
      description: description || '',
      image: image || ''
    });

    await sellerRequest.save();

    res.status(201).json({ success: true, message: 'Seller request submitted! Awaiting admin approval.', request: sellerRequest });
  } catch (error) {
    console.error('Seller request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit seller request' });
  }
});

// GET /api/marketplace/seller-request/my - Get current user's seller request status
router.get('/seller-request/my', verifyUser, async (req, res) => {
  try {
    const request = await SellerRequest.findOne({ user: req.user._id });
    const seller = await Seller.findOne({ user: req.user._id });
    res.json({ success: true, request, seller });
  } catch (error) {
    console.error('Get my seller request error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seller request' });
  }
});

// GET /api/marketplace/seller-requests - Admin: get all seller requests
router.get('/seller-requests', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await SellerRequest.find(filter)
      .populate('user', 'name email profilePhoto')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get seller requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seller requests' });
  }
});

// PUT /api/marketplace/seller-requests/:id/approve - Admin: approve a seller request
router.put('/seller-requests/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const sellerRequest = await SellerRequest.findById(req.params.id).populate('user', 'name email');
    if (!sellerRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (sellerRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Request is already ${sellerRequest.status}` });
    }

    // Check if user is already a seller (safety check)
    const existingSeller = await Seller.findOne({ user: sellerRequest.user._id });
    if (existingSeller) {
      sellerRequest.status = 'approved';
      await sellerRequest.save();
      return res.status(400).json({ success: false, error: 'User is already a seller' });
    }

    // Create the seller profile
    const seller = new Seller({
      user: sellerRequest.user._id,
      name: sellerRequest.shopName,
      location: sellerRequest.location,
      category: sellerRequest.category,
      phone: sellerRequest.phone,
      description: sellerRequest.description,
      image: sellerRequest.image
    });

    await seller.save();

    // Update request status
    sellerRequest.status = 'approved';
    sellerRequest.reviewedBy = req.user._id;
    sellerRequest.reviewedAt = new Date();
    sellerRequest.adminNote = req.body.note || '';
    await sellerRequest.save();

    res.json({ success: true, message: 'Seller request approved', seller, request: sellerRequest });
  } catch (error) {
    console.error('Approve seller request error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve request' });
  }
});

// PUT /api/marketplace/seller-requests/:id/reject - Admin: reject a seller request
router.put('/seller-requests/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const sellerRequest = await SellerRequest.findById(req.params.id);
    if (!sellerRequest) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (sellerRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Request is already ${sellerRequest.status}` });
    }

    sellerRequest.status = 'rejected';
    sellerRequest.reviewedBy = req.user._id;
    sellerRequest.reviewedAt = new Date();
    sellerRequest.adminNote = req.body.note || 'Your request was not approved at this time.';
    await sellerRequest.save();

    res.json({ success: true, message: 'Seller request rejected', request: sellerRequest });
  } catch (error) {
    console.error('Reject seller request error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
});

// ============ SELLER ROUTES ============

// GET /api/marketplace/sellers - Get all sellers
router.get('/sellers', async (req, res) => {
  try {
    const sellers = await Seller.find({ isActive: true })
      .populate('user', 'name email profilePhoto')
      .sort({ createdAt: -1 });
    res.json({ success: true, sellers });
  } catch (error) {
    console.error('Get sellers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sellers' });
  }
});

// GET /api/marketplace/sellers/:id - Get single seller
router.get('/sellers/:id', async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id)
      .populate('user', 'name email profilePhoto');
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    
    // Get products by this seller
    const products = await Product.find({ seller: req.params.id, isActive: true });
    
    res.json({ success: true, seller, products });
  } catch (error) {
    console.error('Get seller error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seller' });
  }
});

// PUT /api/marketplace/sellers/:id - Update a seller (owner or admin)
router.put('/sellers/:id', verifyUser, async (req, res) => {
  try {
    const { name, location, category, phone, description, image } = req.body;
    
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    // Only the seller owner or admin can update
    const isOwner = seller.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (name) seller.name = name;
    if (location) seller.location = location;
    if (category) seller.category = category;
    if (phone) seller.phone = phone;
    if (description !== undefined) seller.description = description;
    if (image !== undefined) seller.image = image;

    await seller.save();
    
    res.json({ success: true, message: 'Seller updated successfully', seller });
  } catch (error) {
    console.error('Update seller error:', error);
    res.status(500).json({ success: false, error: 'Failed to update seller' });
  }
});

// DELETE /api/marketplace/sellers/:id - Delete a seller (admin only)
router.delete('/sellers/:id', verifyAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndDelete(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    res.json({ success: true, message: 'Seller deleted successfully' });
  } catch (error) {
    console.error('Delete seller error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete seller' });
  }
});

// ============ PRODUCT ROUTES ============

// GET /api/marketplace/products - Get all products
router.get('/products', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    
    if (category && category !== 'All') {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .populate('seller', 'name location phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// POST /api/marketplace/products - Add a new product (approved sellers only)
router.post('/products', verifyUser, verifySeller, async (req, res) => {
  try {
    const { name, price, category, image, description, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, price, and category are required' 
      });
    }

    const product = new Product({
      name,
      price,
      category,
      seller: req.seller._id,
      image: image || '',
      description: description || '',
      stock: stock || 0,
      addedBy: req.user._id
    });

    await product.save();
    await product.populate('seller', 'name location phone');

    res.status(201).json({ 
      success: true, 
      message: 'Product added successfully',
      product 
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ success: false, error: 'Failed to add product' });
  }
});

// GET /api/marketplace/products/:id - Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name location phone image category description');
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// PUT /api/marketplace/products/:id - Update a product (owner or admin)
router.put('/products/:id', verifyUser, async (req, res) => {
  try {
    const { name, price, category, image, description, stock } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const isOwner = product.addedBy && product.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this product' });
    }

    if (name) product.name = name;
    if (price !== undefined) product.price = price;
    if (category) product.category = category;
    if (image !== undefined) product.image = image;
    if (description !== undefined) product.description = description;
    if (stock !== undefined) product.stock = stock;

    await product.save();
    await product.populate('seller', 'name location phone');
    
    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/marketplace/products/:id - Delete a product (owner or admin)
router.delete('/products/:id', verifyUser, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const isOwner = product.addedBy && product.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// ============ STOCK & USER PRODUCT ROUTES ============

// PUT /api/marketplace/products/:id/stock - Update stock (owner or admin)
router.put('/products/:id/stock', verifyUser, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock == null || stock < 0) {
      return res.status(400).json({ success: false, error: 'Valid stock value required' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const isOwner = product.addedBy && product.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'You can only update stock of your own products' });
    }

    product.stock = stock;
    await product.save();
    await product.populate('seller', 'name location phone');

    res.json({ success: true, message: 'Stock updated', product });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ success: false, error: 'Failed to update stock' });
  }
});

// GET /api/marketplace/my-products - Get products added by current user
router.get('/my-products', verifyUser, async (req, res) => {
  try {
    const products = await Product.find({ addedBy: req.user._id, isActive: true })
      .populate('seller', 'name location phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your products' });
  }
});

// GET /api/marketplace/all-products-admin - Admin: get all products with addedBy info
router.get('/all-products-admin', verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('seller', 'name location phone')
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// ============ RATING ROUTES ============

// POST /api/marketplace/products/:id/rate - Rate a product
router.post('/products/:id/rate', verifyUser, async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const existingRatingIndex = product.ratings.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );
    
    if (existingRatingIndex > -1) {
      product.ratings[existingRatingIndex].rating = rating;
      product.ratings[existingRatingIndex].createdAt = new Date();
    } else {
      product.ratings.push({ user: req.user._id, rating });
    }
    
    const totalRatings = product.ratings.length;
    const sumRatings = product.ratings.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = Math.round((sumRatings / totalRatings) * 10) / 10;
    
    await product.save();
    
    res.json({ 
      success: true, 
      averageRating: product.averageRating,
      totalRatings,
      userRating: rating
    });
  } catch (error) {
    console.error('Rate product error:', error);
    res.status(500).json({ success: false, error: 'Failed to rate product' });
  }
});

// GET /api/marketplace/products/:id/rating - Get user's rating for a product
router.get('/products/:id/rating', verifyUser, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const userRating = product.ratings.find(
      r => r.user.toString() === req.user._id.toString()
    );
    
    res.json({ 
      success: true, 
      userRating: userRating ? userRating.rating : 0,
      averageRating: product.averageRating,
      totalRatings: product.ratings.length
    });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ success: false, error: 'Failed to get rating' });
  }
});

// POST /api/marketplace/sellers/:id/rate - Rate a seller
router.post('/sellers/:id/rate', verifyUser, async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }
    
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    
    const existingRatingIndex = seller.ratings.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );
    
    if (existingRatingIndex > -1) {
      seller.ratings[existingRatingIndex].rating = rating;
      seller.ratings[existingRatingIndex].createdAt = new Date();
    } else {
      seller.ratings.push({ user: req.user._id, rating });
    }
    
    const totalRatings = seller.ratings.length;
    const sumRatings = seller.ratings.reduce((sum, r) => sum + r.rating, 0);
    seller.averageRating = Math.round((sumRatings / totalRatings) * 10) / 10;
    seller.totalRatings = totalRatings;
    
    await seller.save();
    
    res.json({ 
      success: true, 
      averageRating: seller.averageRating,
      totalRatings,
      userRating: rating
    });
  } catch (error) {
    console.error('Rate seller error:', error);
    res.status(500).json({ success: false, error: 'Failed to rate seller' });
  }
});

// GET /api/marketplace/sellers/:id/rating - Get user's rating for a seller
router.get('/sellers/:id/rating', verifyUser, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    
    const userRating = seller.ratings.find(
      r => r.user.toString() === req.user._id.toString()
    );
    
    res.json({ 
      success: true, 
      userRating: userRating ? userRating.rating : 0,
      averageRating: seller.averageRating,
      totalRatings: seller.totalRatings
    });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ success: false, error: 'Failed to get rating' });
  }
});

module.exports = router;
