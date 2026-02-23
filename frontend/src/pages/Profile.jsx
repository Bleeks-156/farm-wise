import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Shield, Mail, ArrowLeft, Phone, MapPin, Camera, Loader, Edit3, X, Save, Package, Store, Box, Check, Clock, CheckCircle, XCircle, UserCheck, ShoppingBag, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/profile.css';
import API_BASE from '../config/api';

export default function Profile() {
  const { user, token, login } = useAuth();
  const { theme } = useTheme();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef(null);
  
  const [uploading, setUploading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [uploadError, setUploadError] = useState('');
  
  // Editable fields state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || ''
  });

  // Products state
  const [allProducts, setAllProducts] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [stockValue, setStockValue] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Seller status (for non-admin users)
  const [sellerStatus, setSellerStatus] = useState(null);

  // Admin: seller requests
  const [sellerRequests, setSellerRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    document.body.classList.add('has-profile-bg');
    return () => {
      document.body.classList.remove('has-profile-bg');
    };
  }, []);

  // Fetch seller status for current user
  useEffect(() => {
    if (!token || isAdmin) return;
    const fetchSellerStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/marketplace/seller-request/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setSellerStatus({ request: data.request, seller: data.seller });
      } catch (err) {
        console.error('Fetch seller status error:', err);
      }
    };
    fetchSellerStatus();
  }, [token, isAdmin]);

  // Admin: fetch seller requests
  useEffect(() => {
    if (!token || !isAdmin) return;
    const fetchRequests = async () => {
      setRequestsLoading(true);
      try {
        const res = await fetch(`/api/marketplace/seller-requests?status=${requestFilter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setSellerRequests(data.requests);
      } catch (err) {
        console.error('Fetch seller requests error:', err);
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchRequests();
  }, [token, isAdmin, requestFilter]);

  // Fetch user's orders
  useEffect(() => {
    if (!token) return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/payment/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setOrders(data.orders);
      } catch (err) {
        console.error('Fetch orders error:', err);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        if (isAdmin) {
          const res = await fetch(`${API_BASE}/api/marketplace/all-products-admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) setAllProducts(data.products);
        }
        const res2 = await fetch(`${API_BASE}/api/marketplace/my-products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        if (data2.success) setMyProducts(data2.products);
      } catch (err) {
        console.error('Fetch products error:', err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, [token, isAdmin]);

  const handleStockUpdate = async (productId) => {
    if (stockValue === '' || Number(stockValue) < 0) return;
    setStockSaving(true);
    try {
      const res = await fetch(`/api/marketplace/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock: Number(stockValue) })
      });
      const data = await res.json();
      if (data.success) {
        setMyProducts(prev => prev.map(p => p._id === productId ? { ...p, stock: Number(stockValue) } : p));
        if (isAdmin) {
          setAllProducts(prev => prev.map(p => p._id === productId ? { ...p, stock: Number(stockValue) } : p));
        }
        setEditingStock(null);
        setStockValue('');
      }
    } catch (err) {
      console.error('Stock update error:', err);
    } finally {
      setStockSaving(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/marketplace/seller-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: '' })
      });
      const data = await res.json();
      if (data.success) {
        setSellerRequests(prev => prev.filter(r => r._id !== requestId));
      }
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/marketplace/seller-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: 'Your request was not approved at this time.' })
      });
      const data = await res.json();
      if (data.success) {
        setSellerRequests(prev => prev.filter(r => r._id !== requestId));
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Update localStorage and auth context
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('farmwise-user', JSON.stringify(updatedUser));
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || ''
    });
    setIsEditing(false);
    setSaveError('');
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE}/api/upload/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setProfilePhoto(data.url);
        // Update user in localStorage
        const storedUser = JSON.parse(localStorage.getItem('farmwise-user') || '{}');
        storedUser.profilePhoto = data.url;
        localStorage.setItem('farmwise-user', JSON.stringify(storedUser));
      } else {
        setUploadError(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-fade profile-page">
      {/* Background Image */}
      <div className="profile-bg">
        <img 
          src={theme === 'light' ? '/Profile-L.jpg?v=1' : '/Profile-N.jpg?v=1'} 
          alt="" 
          className="profile-bg-img" 
        />
        <div className="profile-bg-overlay"></div>
      </div>

      <div className="container profile-container">
        <Link to="/" className="profile-back">
          <ArrowLeft size={20} />
          Back to Home
        </Link>

        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-wrapper" onClick={handlePhotoClick}>
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {isAdmin ? <Shield size={48} /> : <User size={48} />}
                </div>
              )}
              <div className="profile-avatar-overlay">
                {uploading ? <Loader size={24} className="profile-upload-spinner" /> : <Camera size={24} />}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="profile-file-input"
              />
            </div>
            {uploadError && <p className="profile-upload-error">{uploadError}</p>}
            
            <h1 className="profile-title">{user?.name || 'User Profile'}</h1>
            
            <div className="profile-role-badge">
              {isAdmin ? (
                <>
                  <Shield size={18} />
                  <span>Administrator</span>
                </>
              ) : sellerStatus?.seller ? (
                <>
                  <Store size={18} />
                  <span>Verified Seller</span>
                </>
              ) : (
                <>
                  <User size={18} />
                  <span>Member</span>
                </>
              )}
            </div>

            {/* Seller status for non-admin users */}
            {!isAdmin && sellerStatus && (
              <div className="profile-seller-status">
                {sellerStatus.seller ? (
                  <div className="profile-seller-approved">
                    <CheckCircle size={16} />
                    <span>Approved Seller — <strong>{sellerStatus.seller.name}</strong></span>
                  </div>
                ) : sellerStatus.request?.status === 'pending' ? (
                  <div className="profile-seller-pending">
                    <Clock size={16} />
                    <span>Seller request pending approval</span>
                  </div>
                ) : sellerStatus.request?.status === 'rejected' ? (
                  <div className="profile-seller-rejected">
                    <XCircle size={16} />
                    <span>Seller request was rejected{sellerStatus.request.adminNote ? `: ${sellerStatus.request.adminNote}` : ''}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="profile-info-section">
            <div className="profile-section-header">
              <h2 className="profile-section-title">Personal Information</h2>
              {!isEditing ? (
                <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                  <Edit3 size={16} />
                  Edit
                </button>
              ) : (
                <div className="profile-edit-actions">
                  <button className="profile-cancel-btn" onClick={handleCancel} disabled={saving}>
                    <X size={16} />
                    Cancel
                  </button>
                  <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader size={16} className="profile-save-spinner" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {saveError && <p className="profile-save-error">{saveError}</p>}
            {saveSuccess && <p className="profile-save-success">Profile updated successfully!</p>}
            
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <div className="profile-info-label">
                  <User size={18} />
                  <span>Name</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="profile-input"
                    placeholder="Enter your name"
                  />
                ) : (
                  <p className="profile-info-value">{user?.name || 'N/A'}</p>
                )}
              </div>

              <div className="profile-info-item">
                <div className="profile-info-label">
                  <Mail size={18} />
                  <span>Email</span>
                </div>
                <p className="profile-info-value profile-info-readonly">{user?.email || user?.emailOrId || 'N/A'}</p>
              </div>

              <div className="profile-info-item">
                <div className="profile-info-label">
                  <Phone size={18} />
                  <span>Phone</span>
                </div>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="profile-input"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="profile-info-value">{user?.phone || 'Not provided'}</p>
                )}
              </div>

              <div className="profile-info-item">
                <div className="profile-info-label">
                  <MapPin size={18} />
                  <span>Location</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="profile-input"
                    placeholder="Enter your location"
                  />
                ) : (
                  <p className="profile-info-value">{user?.location || 'Not provided'}</p>
                )}
              </div>

            </div>
          </div>

          {/* Admin: Seller Requests Panel */}
          {isAdmin && (
            <div className="profile-info-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">
                  <UserCheck size={18} />
                  Seller Requests
                </h2>
                <div className="profile-request-filters">
                  {['pending', 'approved', 'rejected'].map(s => (
                    <button
                      key={s}
                      className={`profile-req-filter-btn ${requestFilter === s ? 'active' : ''}`}
                      onClick={() => setRequestFilter(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {requestsLoading ? (
                <div className="profile-products-loading">
                  <Loader size={20} className="profile-upload-spinner" />
                  Loading requests...
                </div>
              ) : sellerRequests.length === 0 ? (
                <p className="profile-products-empty">No {requestFilter} seller requests.</p>
              ) : (
                <div className="profile-products-list">
                  {sellerRequests.map(req => (
                    <div key={req._id} className="profile-request-item">
                      <div className="profile-request-avatar">
                        {req.user?.profilePhoto ? (
                          <img src={req.user.profilePhoto} alt="" className="profile-request-avatar-img" />
                        ) : (
                          <div className="profile-request-avatar-placeholder"><User size={18} /></div>
                        )}
                      </div>
                      <div className="profile-request-info">
                        <span className="profile-request-name">{req.user?.name || 'Unknown'}</span>
                        <span className="profile-request-email">{req.user?.email}</span>
                        <span className="profile-request-shop">
                          <Store size={12} /> {req.shopName} — {req.location}
                        </span>
                        <span className="profile-request-detail">
                          {req.category} · {req.phone}
                        </span>
                        {req.description && (
                          <span className="profile-request-desc">{req.description}</span>
                        )}
                      </div>
                      {requestFilter === 'pending' && (
                        <div className="profile-request-actions">
                          <button
                            className="profile-req-approve-btn"
                            onClick={() => handleApproveRequest(req._id)}
                            disabled={actionLoading === req._id}
                          >
                            {actionLoading === req._id ? <Loader size={14} className="profile-upload-spinner" /> : <CheckCircle size={14} />}
                            Approve
                          </button>
                          <button
                            className="profile-req-reject-btn"
                            onClick={() => handleRejectRequest(req._id)}
                            disabled={actionLoading === req._id}
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                      {requestFilter !== 'pending' && (
                        <div className="profile-request-status-col">
                          <span className={`profile-req-status-badge profile-req-${req.status}`}>
                            {req.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {req.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Orders Section */}
          {!ordersLoading && orders.length > 0 && (
            <div className="profile-info-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">
                  <ShoppingBag size={18} />
                  My Orders ({orders.length})
                </h2>
              </div>
              <div className="profile-products-list">
                {orders.map(order => (
                  <div key={order.id} className="profile-order-item">
                    <div className="profile-order-img-wrap">
                      {order.product?.image ? (
                        <img src={order.product.image} alt={order.product?.name} className="profile-product-img" />
                      ) : (
                        <div className="profile-order-img-placeholder"><Package size={20} /></div>
                      )}
                    </div>
                    <div className="profile-order-info">
                      <Link to={order.product ? `/marketplace/product/${order.product._id}` : '#'} className="profile-product-name">
                        {order.product?.name || 'Product unavailable'}
                      </Link>
                      <span className="profile-product-meta">
                        Qty: {order.quantity} · ₹{order.totalAmount?.toLocaleString('en-IN')}
                      </span>
                      <span className="profile-order-date">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="profile-order-status-col">
                      <span className={`profile-order-payment ${order.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                        <CreditCard size={12} />
                        {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus}
                      </span>
                      <span className={`profile-order-status ${order.orderStatus}`}>
                        {order.orderStatus === 'confirmed' ? <CheckCircle size={12} /> : order.orderStatus === 'cancelled' ? <XCircle size={12} /> : <Clock size={12} />}
                        {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Products Section */}
          {myProducts.length > 0 && (
            <div className="profile-info-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">
                  <Package size={18} />
                  My Products ({myProducts.length})
                </h2>
              </div>
              <div className="profile-products-list">
                {myProducts.map(product => (
                  <div key={product._id} className="profile-product-item">
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=100&h=100&fit=crop'}
                      alt={product.name}
                      className="profile-product-img"
                    />
                    <div className="profile-product-info">
                      <Link to={`/marketplace/product/${product._id}`} className="profile-product-name">
                        {product.name}
                      </Link>
                      <span className="profile-product-meta">
                        {product.category} · ₹{product.price}
                      </span>
                    </div>
                    <div className="profile-product-stock">
                      {editingStock === product._id ? (
                        <div className="profile-stock-edit">
                          <input
                            type="number"
                            min="0"
                            value={stockValue}
                            onChange={(e) => setStockValue(e.target.value)}
                            className="profile-stock-input"
                            placeholder="Qty"
                          />
                          <button
                            className="profile-stock-save"
                            onClick={() => handleStockUpdate(product._id)}
                            disabled={stockSaving}
                          >
                            {stockSaving ? <Loader size={12} className="profile-upload-spinner" /> : <Check size={14} />}
                          </button>
                          <button
                            className="profile-stock-cancel"
                            onClick={() => { setEditingStock(null); setStockValue(''); }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className={`profile-stock-badge ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}
                          onClick={() => { setEditingStock(product._id); setStockValue(String(product.stock)); }}
                          title="Click to edit stock"
                        >
                          <Box size={13} />
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          <Edit3 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin: All Products Section */}
          {isAdmin && (
            <div className="profile-info-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">
                  <Store size={18} />
                  All Marketplace Products ({allProducts.length})
                </h2>
              </div>
              {productsLoading ? (
                <div className="profile-products-loading">
                  <Loader size={20} className="profile-upload-spinner" />
                  Loading products...
                </div>
              ) : allProducts.length === 0 ? (
                <p className="profile-products-empty">No products in the marketplace yet.</p>
              ) : (
                <div className="profile-products-list">
                  {allProducts.map(product => (
                    <div key={product._id} className="profile-product-item">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=100&h=100&fit=crop'}
                        alt={product.name}
                        className="profile-product-img"
                      />
                      <div className="profile-product-info">
                        <Link to={`/marketplace/product/${product._id}`} className="profile-product-name">
                          {product.name}
                        </Link>
                        <span className="profile-product-meta">
                          {product.category} · ₹{product.price}
                          {product.seller && ` · ${product.seller.name}`}
                        </span>
                        <span className="profile-product-added-by">
                          Added by: {product.addedBy ? `${product.addedBy.name} (${product.addedBy.email})` : 'System'}
                        </span>
                      </div>
                      <div className="profile-product-stock">
                        <span className={`profile-stock-badge ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                          <Box size={13} />
                          {product.stock > 0 ? `${product.stock}` : 'Out'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
