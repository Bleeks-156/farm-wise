import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  CreditCard,
  Loader,
  Package,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import '../styles/cart.css';

export default function Cart() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], totalAmount: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [toast, setToast] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (err) {
      console.error('Fetch cart error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCart();
  }, [token]);

  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) return;
    setUpdating(itemId);
    try {
      const res = await fetch('/api/cart/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, quantity: newQty })
      });
      const data = await res.json();
      if (data.success) {
        fetchCart();
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to update' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId) => {
    setUpdating(itemId);
    try {
      const res = await fetch(`/api/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchCart();
        setToast({ type: 'success', text: 'Item removed' });
        setTimeout(() => setToast(null), 2000);
      }
    } catch (err) {
      console.error('Remove error:', err);
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    try {
      await fetch('/api/cart/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCart();
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;
    setCheckingOut(true);
    try {
      // Checkout the first item for now (Stripe supports one product per session in our setup)
      // For a full cart checkout, you'd create a multi-line-item session
      const res = await fetch('/api/payment/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: cart.items[0].product._id,
          quantity: cart.items[0].quantity
        })
      });
      const data = await res.json();
      if (data.success && data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        setToast({ type: 'error', text: data.error || 'Checkout failed' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Failed to start checkout' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="cart-page">
        <div className="cart-loading">
          <Loader size={36} className="spinner" />
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      {toast && (
        <div className={`cart-toast cart-toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.text}
        </div>
      )}

      <div className="container">
        <div className="cart-header">
          <Link to="/marketplace" className="cart-back">
            <ArrowLeft size={18} />
            Continue Shopping
          </Link>
          <h1 className="cart-title">
            <ShoppingCart size={24} />
            Shopping Cart
            {cart.itemCount > 0 && <span className="cart-count-badge">{cart.itemCount}</span>}
          </h1>
        </div>

        {cart.items.length === 0 ? (
          <div className="cart-empty">
            <Package size={56} />
            <h2>Your cart is empty</h2>
            <p>Browse our marketplace to find great agricultural products.</p>
            <Link to="/marketplace" className="cart-shop-btn">
              <ShoppingCart size={18} />
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items-col">
              <div className="cart-items-header">
                <span>{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</span>
                <button className="cart-clear-btn" onClick={clearCart}>Clear All</button>
              </div>

              {cart.items.map((item) => (
                <div key={item._id} className="cart-item">
                  <Link to={`/marketplace/product/${item.product._id}`} className="cart-item-image-wrap">
                    <img
                      src={item.product.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&h=200&fit=crop'}
                      alt={item.product.name}
                      className="cart-item-image"
                    />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/marketplace/product/${item.product._id}`} className="cart-item-name">
                      {item.product.name}
                    </Link>
                    <span className="cart-item-category">{item.product.category}</span>
                    {item.product.seller && (
                      <span className="cart-item-seller">by {item.product.seller.name}</span>
                    )}
                    <span className="cart-item-price">₹{item.product.price?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="cart-item-controls">
                    <div className="cart-qty-control">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updating === item._id}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="cart-qty-value">
                        {updating === item._id ? <Loader size={12} className="spinner" /> : item.quantity}
                      </span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        disabled={updating === item._id || (item.product.stock > 0 && item.quantity >= item.product.stock)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="cart-item-subtotal">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                    <button
                      className="cart-remove-btn"
                      onClick={() => removeItem(item._id)}
                      disabled={updating === item._id}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary-col">
              <div className="cart-summary">
                <h3>Order Summary</h3>
                <div className="cart-summary-rows">
                  <div className="cart-summary-row">
                    <span>Subtotal ({cart.itemCount} items)</span>
                    <span>₹{cart.totalAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Delivery</span>
                    <span className="cart-free">FREE</span>
                  </div>
                  <div className="cart-summary-divider" />
                  <div className="cart-summary-row cart-summary-total">
                    <span>Total</span>
                    <span>₹{cart.totalAmount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button
                  className="cart-checkout-btn"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <><Loader size={18} className="spinner" /> Processing...</>
                  ) : (
                    <><CreditCard size={18} /> Proceed to Checkout</>
                  )}
                </button>
                <p className="cart-secure-text">🔒 Secure checkout powered by Stripe</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
