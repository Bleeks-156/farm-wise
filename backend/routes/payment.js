const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');

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

// Create Stripe Checkout Session
router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Product ID and valid quantity required' });
    }

    const product = await Product.findById(productId).populate('seller');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, error: 'Insufficient stock' });
    }

    const totalAmount = product.price * quantity;

    // Create order in DB with pending status
    const order = await Order.create({
      user: req.userId,
      product: product._id,
      quantity,
      totalAmount,
      paymentStatus: 'pending',
      orderStatus: 'processing'
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: product.name,
            description: product.description ? product.description.substring(0, 200) : `${product.category} from FarmWise`,
            images: product.image ? [product.image] : [],
          },
          unit_amount: Math.round(product.price * 100), // Stripe uses paise
        },
        quantity: quantity,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${req.headers.origin}/marketplace/product/${product._id}`,
      metadata: {
        orderId: order._id.toString(),
        productId: product._id.toString(),
        userId: req.userId,
        quantity: quantity.toString()
      }
    });

    // Update order with stripe session ID
    order.stripeSessionId = session.id;
    await order.save();

    res.json({ success: true, sessionUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// Verify payment and update order
router.get('/verify/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const order = await Order.findOne({ stripeSessionId: sessionId })
      .populate('product')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (session.payment_status === 'paid' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      await order.save();

      // Reduce stock
      await Product.findByIdAndUpdate(order.product._id, {
        $inc: { stock: -order.quantity }
      });

      // Remove purchased item from user's cart
      const cart = await Cart.findOne({ user: order.user._id || order.user });
      if (cart) {
        cart.items = cart.items.filter(
          item => item.product.toString() !== (order.product._id || order.product).toString()
        );
        await cart.save();
      }
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        product: order.product,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt
      },
      paymentStatus: session.payment_status
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

// Get user's orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate('product')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      orders: orders.map(o => ({
        id: o._id,
        product: o.product,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        createdAt: o.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

module.exports = router;
