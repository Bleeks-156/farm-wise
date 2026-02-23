import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Store,
  Edit2,
  Trash2,
  X,
  Upload,
  Loader,
  Package,
  Star
} from 'lucide-react';
import '../styles/seller-details.css';

const CATEGORIES = [
  { id: 'seeds', label: 'Seeds' },
  { id: 'fertilizers', label: 'Fertilizers' },
  { id: 'pesticides', label: 'Pesticides' },
  { id: 'equipment', label: 'Equipment' },
];

export default function SellerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isAdmin, token } = useAuth();
  
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Rating state
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    category: '',
    phone: '',
    description: '',
    image: ''
  });
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchSeller();
    fetchUserRating();
  }, [id]);

  const fetchUserRating = async () => {
    try {
      const response = await fetch(`/api/marketplace/sellers/${id}/rating`, {
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
      const response = await fetch(`/api/marketplace/sellers/${id}/rate`, {
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
        setSeller(prev => ({
          ...prev,
          averageRating: data.averageRating,
          totalRatings: data.totalRatings
        }));
      }
    } catch (error) {
      console.error('Rating error:', error);
    } finally {
      setRatingLoading(false);
    }
  };

  const fetchSeller = async () => {
    try {
      const response = await fetch(`/api/marketplace/sellers/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setSeller(data.seller);
        setProducts(data.products || []);
        setEditForm({
          name: data.seller.name,
          location: data.seller.location,
          category: data.seller.category,
          phone: data.seller.phone,
          description: data.seller.description || '',
          image: data.seller.image || ''
        });
      } else {
        setError(data.error || 'Seller not found');
      }
    } catch (err) {
      setError('Failed to load seller');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/seller', {
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
      const response = await fetch(`/api/marketplace/sellers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setSeller(data.seller);
        setEditModalOpen(false);
      } else {
        alert(data.error || 'Failed to update seller');
      }
    } catch (error) {
      alert('Failed to update seller');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/marketplace/sellers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        navigate('/marketplace');
      } else {
        alert(data.error || 'Failed to delete seller');
      }
    } catch (error) {
      alert('Failed to delete seller');
    }
  };

  if (loading) {
    return (
      <div className="seller-details-page">
        <div className="seller-details-loading">
          <Loader size={40} className="spinner" />
          <p>Loading seller...</p>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="seller-details-page">
        <div className="seller-details-error">
          <Store size={48} />
          <h2>Seller not found</h2>
          <p>{error || 'The seller you are looking for does not exist.'}</p>
          <Link to="/marketplace" className="back-btn">
            <ArrowLeft size={18} />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-details-page">
      <div className="container">
        <Link to="/marketplace" className="seller-details-back">
          <ArrowLeft size={18} />
          Back to Marketplace
        </Link>

        <div className="seller-details-content">
          <div className="seller-details-header">
            <div className="seller-details-image-wrap">
              <img
                src={seller.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop'}
                alt={seller.name}
                className="seller-details-image"
              />
            </div>

            <div className="seller-details-info">
              <span className="seller-details-category">{seller.category}</span>
              <h1 className="seller-details-title">{seller.name}</h1>
              
              <div className="seller-details-rating-section">
                <div className="seller-average-rating">
                  <Star size={20} fill="#f59e0b" stroke="#f59e0b" />
                  <span className="rating-value">{seller.averageRating?.toFixed(1) || '0.0'}</span>
                  <span className="rating-count">({seller.totalRatings || 0} reviews)</span>
                </div>
              </div>
              
              <div className="seller-user-rating">
                <span className="rate-label">Rate this seller:</span>
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
                        size={24} 
                        fill={(hoverRating || userRating) >= star ? '#f59e0b' : 'none'}
                        stroke={(hoverRating || userRating) >= star ? '#f59e0b' : 'currentColor'}
                      />
                    </button>
                  ))}
                </div>
                {userRating > 0 && <span className="your-rating">Your rating: {userRating}/5</span>}
              </div>

              <p className="seller-details-location">
                <MapPin size={18} />
                {seller.location}
              </p>

              <a href={`tel:${seller.phone.replace(/\s/g, '')}`} className="seller-details-phone">
                <Phone size={18} />
                {seller.phone}
              </a>

              <p className="seller-details-description">
                {seller.description || 'No description available.'}
              </p>

              {isAdmin && (
                <div className="seller-admin-actions">
                  <button 
                    className="admin-action-btn edit-btn"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Edit2 size={16} />
                    Edit Seller
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

          {/* Products by this seller */}
          <div className="seller-products-section">
            <h2 className="seller-products-title">
              <Package size={22} />
              Products by {seller.name}
            </h2>
            
            {products.length === 0 ? (
              <p className="no-products">No products available from this seller yet.</p>
            ) : (
              <div className="seller-products-grid">
                {products.map((product) => (
                  <Link 
                    key={product._id} 
                    to={`/marketplace/product/${product._id}`}
                    className="seller-product-card"
                  >
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=260&fit=crop'}
                      alt={product.name}
                      className="seller-product-image"
                    />
                    <div className="seller-product-info">
                      <span className="seller-product-category">{product.category}</span>
                      <h3 className="seller-product-name">{product.name}</h3>
                      <p className="seller-product-price">₹{product.price}</p>
                    </div>
                  </Link>
                ))}
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
              <h3>Edit Seller</h3>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="modal-form">
              <label>
                <span>Seller Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Location</span>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  required
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
                <span>Phone</span>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
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
                <span>Seller Image</span>
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
            <h3>Delete Seller?</h3>
            <p>Are you sure you want to delete "{seller.name}"? This will also affect all products from this seller.</p>
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
