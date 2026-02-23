const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-secret-key-2024';

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// GET /api/cart - Get user's cart
router.get('/', authenticate, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.userId })
      .populate({
        path: 'items.product',
        populate: { path: 'seller', select: 'name location' }
      });

    if (!cart) {
      cart = { items: [] };
    }

    // Filter out items where product was deleted
    const validItems = (cart.items || []).filter(item => item.product != null);

    const totalAmount = validItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    res.json({
      success: true,
      cart: {
        items: validItems.map(item => ({
          _id: item._id,
          product: item.product,
          quantity: item.quantity
        })),
        totalAmount,
        itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
});

// POST /api/cart/add - Add item to cart
router.post('/add', authenticate, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > product.stock && product.stock > 0) {
        return res.status(400).json({ success: false, error: `Only ${product.stock} available` });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      if (quantity > product.stock && product.stock > 0) {
        return res.status(400).json({ success: false, error: `Only ${product.stock} available` });
      }
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    // Return updated cart count
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, message: 'Added to cart', itemCount });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ success: false, error: 'Failed to add to cart' });
  }
});

// PUT /api/cart/update - Update item quantity
router.put('/update', authenticate, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;

    if (!itemId || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Valid item ID and quantity required' });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    const product = await Product.findById(item.product);
    if (product && product.stock > 0 && quantity > product.stock) {
      return res.status(400).json({ success: false, error: `Only ${product.stock} available` });
    }

    item.quantity = quantity;
    await cart.save();

    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});

// DELETE /api/cart/remove/:itemId - Remove item from cart
router.delete('/remove/:itemId', authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    await cart.save();

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove item' });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', authenticate, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.userId }, { items: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear cart' });
  }
});

// GET /api/cart/count - Get cart item count (lightweight)
router.get('/count', authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId });
    const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, count: 0 });
  }
});

module.exports = router;
