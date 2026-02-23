import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Store,
  ShoppingCart,
  MessageCircle,
  Edit2,
  Trash2,
  X,
  Upload,
  Loader,
  Package,
  Star,
  ChevronRight,
  Minus,
  Plus,
  Shield,
  Truck,
  RotateCcw,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Box,
  Share2
} from 'lucide-react';
import '../styles/product-details.css';

const CATEGORIES = [
  { id: 'seeds', label: 'Seeds' },
  { id: 'fertilizers', label: 'Fertilizers' },
  { id: 'pesticides', label: 'Pesticides' },
  { id: 'equipment', label: 'Equipment' },
];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isAdmin, token } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState([]);
  
  // Rating state
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);

  // Purchase state
  const [quantity, setQuantity] = useState(1);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState(null);
  
  // Share state
  const [copied, setCopied] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    category: '',
    seller: '',
    description: '',
    image: ''
  });
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchProduct();
    if (token) {
      fetchUserRating();
      if (isAdmin) {
        fetchSellers();
      }
    }
  }, [id, isAdmin, token]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/marketplace/products/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setProduct(data.product);
        setEditForm({
          name: data.product.name,
          price: data.product.price,
          category: data.product.category,
          seller: data.product.seller?._id || '',
          description: data.product.description || '',
          image: data.product.image || ''
        });
      } else {
        setError(data.error || 'Product not found');
      }
    } catch (err) {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchSellers = async () => {
    try {
      const response = await fetch('/api/marketplace/sellers');
      const data = await response.json();
      if (data.success) {
        setSellers(data.sellers);
      }
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    }
  };

  const fetchUserRating = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/marketplace/products/${id}/rating`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserRating(data.userRating);
      }
    } catch (err) {
      console.error('Failed to fetch rating:', err);
    }
  };

  const handleRating = async (rating) => {
    setRatingLoading(true);
    try {
      const response = await fetch(`/api/marketplace/products/${id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      });
      
      const data = await response.json();
      if (data.success) {
        setUserRating(rating);
        setProduct(prev => ({
          ...prev,
          averageRating: data.averageRating
        }));
      }
    } catch (error) {
      console.error('Rating error:', error);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!token) {
      setPurchaseToast({ type: 'error', message: 'Please login to add to cart' });
      setTimeout(() => setPurchaseToast(null), 3000);
      return;
    }
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product._id, quantity })
      });
      const data = await res.json();
      if (data.success) {
        setPurchaseToast({ type: 'success', message: 'Added to cart!' });
      } else {
        setPurchaseToast({ type: 'error', message: data.error || 'Failed to add to cart' });
      }
    } catch (err) {
      setPurchaseToast({ type: 'error', message: 'Failed to add to cart' });
    }
    setTimeout(() => setPurchaseToast(null), 3000);
  };

  const handleBuyNow = async () => {
    if (!token) {
      setPurchaseToast({ type: 'error', message: 'Please login to purchase' });
      setTimeout(() => setPurchaseToast(null), 3000);
      return;
    }
    if (product.stock < 1) return;

    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/payment/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product._id,
          quantity
        })
      });

      const data = await response.json();
      if (data.success && data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        setPurchaseToast({ type: 'error', message: data.error || 'Failed to start checkout' });
        setTimeout(() => setPurchaseToast(null), 3000);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setPurchaseToast({ type: 'error', message: 'Failed to connect to payment service' });
      setTimeout(() => setPurchaseToast(null), 3000);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/product', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setEditForm(prev => ({ ...prev, image: data.url }));
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setImageUploading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch(`/api/marketplace/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setProduct(data.product);
        setEditModalOpen(false);
      } else {
        alert(data.error || 'Failed to update product');
      }
    } catch (error) {
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/marketplace/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        navigate('/marketplace');
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch (error) {
      alert('Failed to delete product');
    }
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}/marketplace/product/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inStock = product?.stock > 0;
  const lowStock = product?.stock > 0 && product?.stock <= 5;

  if (loading) {
    return (
      <div className="product-details-page">
        <div className="product-details-loading">
          <Loader size={40} className="spinner" />
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-details-page">
        <div className="product-details-error">
          <Package size={48} />
          <h2>Product not found</h2>
          <p>{error || 'The product you are looking for does not exist.'}</p>
          <Link to="/marketplace" className="back-btn">
            <ArrowLeft size={18} />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-details-page">
      {/* Toast notification */}
      {purchaseToast && (
        <div className={`pd-toast pd-toast-${purchaseToast.type}`}>
          {purchaseToast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {purchaseToast.message}
        </div>
      )}

      <div className="container">
        <nav className="pd-breadcrumb">
          <Link to="/marketplace">Marketplace</Link>
          <ChevronRight size={14} />
          <Link to={`/marketplace?category=${product.category?.toLowerCase()}`}>{product.category}</Link>
          <ChevronRight size={14} />
          <span>{product.name}</span>
        </nav>

        <div className="pd-grid">
          {/* Left: Image */}
          <div className="pd-image-col">
            <div className="pd-image-wrapper">
              <img
                src={product.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop'}
                alt={product.name}
                className="pd-image"
              />
              <span className="pd-category-badge">{product.category}</span>
            </div>
          </div>

          {/* Right: Info */}
          <div className="pd-info-col">
            <h1 className="pd-title">{product.name}</h1>

            <div className="pd-rating-row">
              <div className="pd-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16}
                    fill={s <= Math.round(product.averageRating || 0) ? '#f59e0b' : 'none'}
                    stroke={s <= Math.round(product.averageRating || 0) ? '#f59e0b' : '#cbd5e1'}
                  />
                ))}
              </div>
              <span className="pd-rating-text">
                {product.averageRating?.toFixed(1) || '0.0'} ({product.ratings?.length || 0} reviews)
              </span>
            </div>

            <div className="pd-price-row">
              <span className="pd-price">₹{product.price?.toLocaleString('en-IN')}</span>
              <span className="pd-price-unit">per unit</span>
            </div>

            <div className="pd-divider" />

            {/* Stock status */}
            <div className={`pd-stock ${inStock ? (lowStock ? 'pd-stock-low' : 'pd-stock-in') : 'pd-stock-out'}`}>
              {inStock ? (
                <>
                  <CheckCircle size={16} />
                  {lowStock
                    ? <span>Only {product.stock} left in stock — order soon</span>
                    : <span>In Stock ({product.stock} available)</span>
                  }
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <span>Out of Stock</span>
                </>
              )}
            </div>

            {/* Quantity selector */}
            {inStock && (
              <div className="pd-quantity-row">
                <span className="pd-qty-label">Quantity:</span>
                <div className="pd-qty-control">
                  <button
                    className="pd-qty-btn"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="pd-qty-value">{quantity}</span>
                  <button
                    className="pd-qty-btn"
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="pd-qty-total">Total: ₹{(product.price * quantity).toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="pd-actions">
              <button
                className="pd-buy-btn"
                onClick={handleBuyNow}
                disabled={!inStock || isCheckingOut}
              >
                {isCheckingOut ? (
                  <><Loader size={18} className="spinner" /> Processing...</>
                ) : (
                  <><CreditCard size={18} /> Buy Now</>
                )}
              </button>
              <button
                className="pd-cart-btn"
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
            </div>
            <div className="pd-actions">
              <Link
                to="/advisory/chat"
                state={{
                  productContext: {
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    description: product.description,
                    seller: product.seller?.name
                  }
                }}
                className="pd-advice-btn"
              >
                <MessageCircle size={18} />
                Ask Expert Advice
              </Link>
              <button className="pd-share-btn" onClick={handleShareLink}>
                {copied ? <><CheckCircle size={16} /> Link Copied!</> : <><Share2 size={16} /> Share Link</>}
              </button>
            </div>

            {/* Trust badges */}
            <div className="pd-trust-badges">
              <div className="pd-badge"><Shield size={15} /><span>Secure Payment</span></div>
              <div className="pd-badge"><Truck size={15} /><span>Fast Delivery</span></div>
              <div className="pd-badge"><RotateCcw size={15} /><span>Easy Returns</span></div>
            </div>

            <div className="pd-divider" />

            {/* Description */}
            <div className="pd-desc-section">
              <h3 className="pd-section-title">Product Description</h3>
              <p className="pd-description">
                {product.description || 'No description available for this product.'}
              </p>
            </div>

            {/* Seller info */}
            {product.seller && (
              <div className="pd-seller-card">
                <h3 className="pd-section-title">Sold by</h3>
                <Link to={`/marketplace/seller/${product.seller._id}`} className="pd-seller-link">
                  <Store size={18} />
                  <div className="pd-seller-info">
                    <span className="pd-seller-name">{product.seller.name}</span>
                    <span className="pd-seller-loc">
                      <MapPin size={13} />
                      {product.seller.location}
                    </span>
                  </div>
                  <ChevronRight size={16} />
                </Link>
                {product.seller?.phone && (
                  <a href={`tel:${product.seller.phone.replace(/\s/g, '')}`} className="pd-seller-phone">
                    <Phone size={15} />
                    {product.seller.phone}
                  </a>
                )}
              </div>
            )}

            {/* Rate this product */}
            <div className="pd-rate-section">
              <h3 className="pd-section-title">Rate this product</h3>
              {token ? (
                <div className="pd-rate-row">
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${(hoverRating || userRating) >= star ? 'active' : ''}`}
                        onClick={() => handleRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={ratingLoading}
                      >
                        <Star
                          size={22}
                          fill={(hoverRating || userRating) >= star ? '#f59e0b' : 'none'}
                          stroke={(hoverRating || userRating) >= star ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    ))}
                  </div>
                  {userRating > 0 && <span className="your-rating">Your rating: {userRating}/5</span>}
                </div>
              ) : (
                <p className="pd-login-hint">
                  <Link to="/login">Log in</Link> to rate this product
                </p>
              )}
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div className="product-admin-actions">
                <button
                  className="admin-action-btn edit-btn"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Edit2 size={16} />
                  Edit Product
                </button>
                <button
                  className="admin-action-btn delete-btn"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="modal-form">
              <label>
                <span>Product Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Price (₹)</span>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                  min="0"
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Seller</span>
                <select
                  value={editForm.seller}
                  onChange={(e) => setEditForm(prev => ({ ...prev, seller: e.target.value }))}
                  required
                >
                  {sellers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </label>
              <div className="image-upload-section">
                <span>Product Image</span>
                <div className="upload-box" onClick={() => fileRef.current?.click()}>
                  {editForm.image ? (
                    <img src={editForm.image} alt="Preview" className="upload-preview" />
                  ) : imageUploading ? (
                    <div className="upload-loading">
                      <Loader size={24} className="spinner" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <Upload size={32} />
                      <span>Click to upload</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="file-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving || imageUploading}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Product?</h3>
            <p>Are you sure you want to delete "{product.name}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
