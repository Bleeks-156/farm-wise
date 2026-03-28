import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Search,
  MapPin,
  Package,
  Phone,
  ChevronRight,
  Store,
  Leaf,
  FileText,
  Shield,
  CreditCard,
  Building2,
  Landmark,
  CheckCircle,
  Droplets,
  Wrench,
  ShoppingCart,
  MessageCircle,
  Plus,
  X,
  Upload,
  Loader,
  UserCheck,
  Clock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/marketplace.css';
import API_BASE from '../config/api';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Store },
  { id: 'seeds', label: 'Seeds', icon: Leaf },
  { id: 'fertilizers', label: 'Fertilizers', icon: Droplets },
  { id: 'pesticides', label: 'Pesticides', icon: Package },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
];


export default function Marketplace() {
  const { theme } = useTheme();
  const { isAdmin, token, user } = useAuth();
  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [sellerRequestOpen, setSellerRequestOpen] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState(null);
  
  // Seller status for current user
  const [sellerStatus, setSellerStatus] = useState(null); // null | { request, seller }
  const [sellerStatusLoading, setSellerStatusLoading] = useState(false);

  // Image upload states
  const [productImage, setProductImage] = useState(null);
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productUploading, setProductUploading] = useState(false);
  const [sellerReqImageUrl, setSellerReqImageUrl] = useState('');
  const [sellerReqUploading, setSellerReqUploading] = useState(false);
  const productFileRef = useRef(null);
  const sellerReqFileRef = useRef(null);

  // Document upload states
  const [docUrls, setDocUrls] = useState({
    aadhaarDocument: '',
    panDocument: '',
    businessLicenseDocument: '',
    bankAccountDocument: '',
  });
  const [docUploading, setDocUploading] = useState({});
  const docFileRefs = {
    aadhaar: useRef(null),
    pan: useRef(null),
    businessLicense: useRef(null),
    bankAccount: useRef(null),
  };

  const isSeller = sellerStatus?.seller != null;
  const hasRequest = sellerStatus?.request != null;
  const requestStatus = sellerStatus?.request?.status;

  const getSeller = (sellerId) => sellers.find((s) => s._id === sellerId || s.id === sellerId);

  // Fetch sellers and products from DB
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sellersRes, productsRes] = await Promise.all([
          fetch(`${API_BASE}/api/marketplace/sellers`),
          fetch(`${API_BASE}/api/marketplace/products`)
        ]);
        
        const sellersData = await sellersRes.json();
        const productsData = await productsRes.json();
        
        if (sellersData.success) {
          setSellers(sellersData.sellers);
        }
        if (productsData.success) {
          setProducts(productsData.products);
        }
      } catch (error) {
        console.error('Error fetching marketplace data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch current user's seller status
  useEffect(() => {
    if (!token) return;
    const fetchSellerStatus = async () => {
      setSellerStatusLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/marketplace/seller-request/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSellerStatus({ request: data.request, seller: data.seller });
        }
      } catch (err) {
        console.error('Fetch seller status error:', err);
      } finally {
        setSellerStatusLoading(false);
      }
    };
    fetchSellerStatus();
  }, [token]);

  const filteredProducts = products.filter((p) => {
    const seller = p.seller || getSeller(p.sellerId);
    const matchCategory = category === 'all' || p.category?.toLowerCase() === category;
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      seller?.name?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const filteredSellers = sellers.filter((s) => {
    const matchCategory = category === 'all' || s.category?.toLowerCase() === category;
    const matchSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAddToCart = async (product) => {
    if (!token) {
      setPurchaseToast({ text: 'Please login to add to cart', type: 'error' });
      setTimeout(() => setPurchaseToast(null), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product._id, quantity: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setPurchaseToast({ text: `"${product.name}" added to cart`, type: 'success' });
      } else {
        setPurchaseToast({ text: data.error || 'Failed to add to cart', type: 'error' });
      }
    } catch (err) {
      setPurchaseToast({ text: 'Failed to add to cart', type: 'error' });
    }
    setTimeout(() => setPurchaseToast(null), 3000);
  };

  const handleProductImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setProductImage(file);
    setProductUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${API_BASE}/api/upload/product`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setProductImageUrl(data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setProductUploading(false);
    }
  };

  const handleSellerReqImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSellerReqUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${API_BASE}/api/upload/seller`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setSellerReqImageUrl(data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setSellerReqUploading(false);
    }
  };

  const resetProductForm = () => {
    setProductImage(null);
    setProductImageUrl('');
    setAddProductOpen(false);
  };

  const resetSellerRequestForm = () => {
    setSellerReqImageUrl('');
    setDocUrls({ aadhaarDocument: '', panDocument: '', businessLicenseDocument: '', bankAccountDocument: '' });
    setDocUploading({});
    setSellerRequestOpen(false);
  };

  const handleDocumentUpload = async (file, docType, docField) => {
    if (!file) return;
    setDocUploading(prev => ({ ...prev, [docType]: true }));
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('docType', docType);
      const response = await fetch(`${API_BASE}/api/upload/document`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setDocUrls(prev => ({ ...prev, [docField]: data.url }));
      } else {
        setPurchaseToast({ text: data.error || 'Failed to upload document', type: 'error' });
        setTimeout(() => setPurchaseToast(null), 3000);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      setPurchaseToast({ text: 'Failed to upload document', type: 'error' });
      setTimeout(() => setPurchaseToast(null), 3000);
    } finally {
      setDocUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name.value.trim(),
          price: Number(form.price.value) || 0,
          category: form.category.value || 'Seeds',
          description: form.description.value.trim() || '',
          image: productImageUrl || '',
          stock: Number(form.stock?.value) || 0
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setProducts((prev) => [...prev, data.product]);
        resetProductForm();
        setPurchaseToast({ text: 'Product added successfully!', type: 'success' });
        setTimeout(() => setPurchaseToast(null), 3000);
      } else {
        setPurchaseToast({ text: data.error || 'Failed to add product', type: 'error' });
        setTimeout(() => setPurchaseToast(null), 3000);
      }
    } catch (error) {
      console.error('Add product error:', error);
      setPurchaseToast({ text: 'Failed to add product', type: 'error' });
      setTimeout(() => setPurchaseToast(null), 3000);
    }
  };

  const handleSellerRequest = async (e) => {
    e.preventDefault();
    const form = e.target;

    // Validate required document uploads
    if (!docUrls.aadhaarDocument) {
      setPurchaseToast({ text: 'Please upload your Aadhaar card document', type: 'error' });
      setTimeout(() => setPurchaseToast(null), 3000);
      return;
    }
    if (!docUrls.panDocument) {
      setPurchaseToast({ text: 'Please upload your PAN card document', type: 'error' });
      setTimeout(() => setPurchaseToast(null), 3000);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/seller-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shopName: form.shopName.value.trim(),
          location: form.location.value.trim(),
          category: form.category.value || 'Seeds',
          phone: form.phone.value.trim(),
          description: form.description.value.trim() || '',
          image: sellerReqImageUrl || '',
          aadhaarNumber: form.aadhaarNumber.value.trim(),
          aadhaarDocument: docUrls.aadhaarDocument,
          panNumber: form.panNumber.value.trim(),
          panDocument: docUrls.panDocument,
          gstNumber: form.gstNumber.value.trim(),
          businessLicenseNumber: form.businessLicenseNumber?.value?.trim() || '',
          businessLicenseDocument: docUrls.businessLicenseDocument || '',
          bankAccountDocument: docUrls.bankAccountDocument || '',
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSellerStatus(prev => ({ ...prev, request: data.request }));
        resetSellerRequestForm();
        setPurchaseToast({ text: 'Seller request submitted! Your documents will be verified.', type: 'success' });
        setTimeout(() => setPurchaseToast(null), 4000);
      } else {
        setPurchaseToast({ text: data.error || 'Failed to submit request', type: 'error' });
        setTimeout(() => setPurchaseToast(null), 4000);
      }
    } catch (error) {
      console.error('Seller request error:', error);
      setPurchaseToast({ text: 'Failed to submit request', type: 'error' });
      setTimeout(() => setPurchaseToast(null), 3000);
    }
  };

  // Determine what action buttons to show
  const renderActionButtons = () => {
    if (!token) return null;

    const buttons = [];

    // Approved sellers can add products
    if (isSeller) {
      buttons.push(
        <button
          key="add-product"
          type="button"
          className="marketplace-add-btn"
          onClick={() => setAddProductOpen(true)}
        >
          <Plus size={18} />
          Add Product
        </button>
      );
    }

    // Non-sellers (and non-admin) can request to become a seller
    if (!isSeller && !isAdmin) {
      if (!hasRequest || requestStatus === 'rejected') {
        buttons.push(
          <button
            key="become-seller"
            type="button"
            className="marketplace-add-btn marketplace-seller-req-btn"
            onClick={() => setSellerRequestOpen(true)}
          >
            <UserCheck size={18} />
            Become a Seller
          </button>
        );
      } else if (requestStatus === 'pending') {
        buttons.push(
          <span key="pending-badge" className="marketplace-status-badge marketplace-status-pending">
            <Clock size={14} />
            Seller Request Pending
          </span>
        );
      }
    }

    return buttons;
  };

  return (
    <div className="page-fade marketplace-page">
      {/* Background Image */}
      <div className="marketplace-background-image">
        <img 
          src={theme === 'light' ? '/market-L.jpg' : '/market-N.jpg'} 
          alt="Background" 
          className="marketplace-bg-img"
          key={theme}
        />
        <div className="marketplace-bg-overlay"></div>
      </div>

      {/* Hero */}
      <section className="marketplace-hero">
        <div className="marketplace-hero-bg">
          <div className="marketplace-hero-overlay" />
        </div>
        <div className="container marketplace-hero-content">
          <h1 className="marketplace-hero-title">Hyperlocal Marketplace</h1>
          <p className="marketplace-hero-subtitle">
            Find verified suppliers of seeds, fertilizers, pesticides, and equipment near you.
          </p>
          <div className="marketplace-search-wrap">
            <Search className="marketplace-search-icon" size={22} />
            <input
              type="text"
              placeholder="Search by name, location, or product..."
              className="marketplace-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Tabs + Category filters */}
      <section className="marketplace-filters">
        <div className="container">
          <div className="marketplace-tabs">
            <button
              type="button"
              className={`marketplace-tab ${tab === 'products' ? 'active' : ''}`}
              onClick={() => setTab('products')}
            >
              Products
            </button>
            <button
              type="button"
              className={`marketplace-tab ${tab === 'sellers' ? 'active' : ''}`}
              onClick={() => setTab('sellers')}
            >
              Sellers
            </button>
            {renderActionButtons()}
          </div>
          <div className="marketplace-categories">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`marketplace-cat-btn ${category === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <Icon size={18} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products list */}
      {tab === 'products' && (
        <section className="marketplace-list">
          <div className="container">
            <p className="marketplace-results-count">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            </p>
            <div className="marketplace-grid marketplace-products-grid">
              {filteredProducts.map((product) => {
                const seller = product.seller || getSeller(product.sellerId);
                return (
                  <article key={product._id || product.id} className="marketplace-card marketplace-product-card">
                    <Link to={`/marketplace/product/${product._id}`} className="marketplace-card-image-wrap">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=260&fit=crop'}
                        alt={product.name}
                        className="marketplace-card-image"
                        loading="lazy"
                      />
                      <span className="marketplace-card-price">₹{product.price}</span>
                    </Link>
                    <div className="marketplace-card-body">
                      <span className="marketplace-card-category">{product.category}</span>
                      <Link to={`/marketplace/product/${product._id}`} className="marketplace-card-title-link">
                        <h3 className="marketplace-card-title">{product.name}</h3>
                      </Link>
                      {seller && (
                        <Link to={`/marketplace/seller/${seller._id}`} className="marketplace-card-seller">
                          <Store size={14} />
                          {seller.name}
                        </Link>
                      )}
                      <p className="marketplace-card-desc">
                        {product.description && product.description.length > 80
                          ? product.description.substring(0, 80) + '...'
                          : product.description}
                      </p>
                      <div className="marketplace-card-stock">
                        {product.stock > 0 ? (
                          <span className="stock-in">In Stock ({product.stock})</span>
                        ) : (
                          <span className="stock-out">Out of Stock</span>
                        )}
                      </div>
                      <div className="marketplace-card-actions">
                        <button
                          type="button"
                          className="marketplace-card-cta marketplace-cta-purchase"
                          onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                          disabled={product.stock < 1}
                        >
                          <ShoppingCart size={18} />
                          {product.stock < 1 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <Link
                          to="/advisory/chat"
                          state={{ productContext: product.name }}
                          className="marketplace-card-cta marketplace-cta-advice"
                        >
                          <MessageCircle size={18} />
                          Ask advice
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="marketplace-empty">
                <Package size={48} />
                <p>No products match your filters. Try a different category or search.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sellers list */}
      {tab === 'sellers' && (
        <section className="marketplace-list">
          <div className="container">
            <p className="marketplace-results-count">
              {filteredSellers.length} seller{filteredSellers.length !== 1 ? 's' : ''} found
            </p>
            <div className="marketplace-grid">
              {filteredSellers.map((seller) => (
                <article key={seller._id || seller.id} className="marketplace-card">
                  <div className="marketplace-card-image-wrap">
                    <img
                      src={seller.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=260&fit=crop'}
                      alt={seller.name}
                      className="marketplace-card-image"
                      loading="lazy"
                    />
                  </div>
                  <div className="marketplace-card-body">
                    <span className="marketplace-card-category">{seller.category}</span>
                    <h3 className="marketplace-card-title">{seller.name}</h3>
                    <p className="marketplace-card-location">
                      <MapPin size={14} />
                      {seller.location}
                    </p>
                    <p className="marketplace-card-desc">{seller.description}</p>
                    <a href={`tel:${seller.phone?.replace(/\s/g, '')}`} className="marketplace-card-phone">
                      <Phone size={16} />
                      {seller.phone}
                    </a>
                    <Link to={`/marketplace/seller/${seller._id}`} className="marketplace-card-cta">
                      View details
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {filteredSellers.length === 0 && (
              <div className="marketplace-empty">
                <Store size={48} />
                <p>No sellers match your filters. Try a different category or search.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Add Product modal (Sellers only) */}
      {addProductOpen && (
        <div className="marketplace-modal-overlay" onClick={resetProductForm}>
          <div className="marketplace-modal" onClick={(e) => e.stopPropagation()}>
            <div className="marketplace-modal-header">
              <h3>Add Product</h3>
              <button type="button" className="marketplace-modal-close" onClick={resetProductForm}>
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="marketplace-modal-form">
              <label>
                <span>Product name</span>
                <input type="text" name="name" required placeholder="e.g. Tomato Seeds 100g" />
              </label>
              <label>
                <span>Price (₹)</span>
                <input type="number" name="price" min="0" step="1" required placeholder="299" />
              </label>
              <label>
                <span>Category</span>
                <select name="category">
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Description</span>
                <textarea name="description" rows={3} placeholder="Brief description" />
              </label>
              <label>
                <span>Stock Quantity</span>
                <input type="number" name="stock" min="0" step="1" placeholder="e.g. 50" defaultValue="0" />
              </label>
              <div className="marketplace-image-upload">
                <span>Product Image</span>
                <div 
                  className="marketplace-upload-box"
                  onClick={() => productFileRef.current?.click()}
                >
                  {productImageUrl ? (
                    <img src={productImageUrl} alt="Preview" className="marketplace-upload-preview" />
                  ) : productUploading ? (
                    <div className="marketplace-upload-loading">
                      <Loader size={24} className="marketplace-upload-spinner" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="marketplace-upload-placeholder">
                      <Upload size={32} />
                      <span>Click to upload image</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={productFileRef}
                  onChange={handleProductImageChange}
                  accept="image/*"
                  className="marketplace-file-input"
                />
              </div>
              <div className="marketplace-modal-actions">
                <button type="button" className="marketplace-modal-cancel" onClick={resetProductForm}>
                  Cancel
                </button>
                <button type="submit" className="marketplace-modal-submit" disabled={productUploading}>
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Become a Seller Request modal */}
      {sellerRequestOpen && (
        <div className="marketplace-modal-overlay" onClick={resetSellerRequestForm}>
          <div className="marketplace-modal marketplace-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="marketplace-modal-header">
              <h3>Become a Verified Seller</h3>
              <button type="button" className="marketplace-modal-close" onClick={resetSellerRequestForm}>
                <X size={22} />
              </button>
            </div>
            <p className="marketplace-modal-desc">
              Submit your business details and government-issued documents for verification. An admin will review and approve your request.
            </p>
            <form onSubmit={handleSellerRequest} className="marketplace-modal-form">

              {/* ── Section: Business Information ── */}
              <div className="seller-form-section">
                <div className="seller-form-section-title">
                  <Store size={18} />
                  <span>Business Information</span>
                </div>
                <label>
                  <span>Shop / Business Name *</span>
                  <input type="text" name="shopName" required placeholder="e.g. Green Valley Agri Store" />
                </label>
                <div className="seller-form-row">
                  <label>
                    <span>Location *</span>
                    <input type="text" name="location" required placeholder="e.g. Coimbatore, Tamil Nadu" />
                  </label>
                  <label>
                    <span>Category *</span>
                    <select name="category">
                      {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.label}>{c.label}</option>
                      ))}
                      <option value="All">All Categories</option>
                    </select>
                  </label>
                </div>
                <div className="seller-form-row">
                  <label>
                    <span>Phone *</span>
                    <input type="tel" name="phone" required placeholder="+91 98765 43210" />
                  </label>
                </div>
                <label>
                  <span>Description</span>
                  <textarea name="description" rows={2} placeholder="Tell us about your business..." />
                </label>
                <div className="marketplace-image-upload">
                  <span>Shop Image (optional)</span>
                  <div 
                    className="marketplace-upload-box"
                    onClick={() => sellerReqFileRef.current?.click()}
                  >
                    {sellerReqImageUrl ? (
                      <img src={sellerReqImageUrl} alt="Preview" className="marketplace-upload-preview" />
                    ) : sellerReqUploading ? (
                      <div className="marketplace-upload-loading">
                        <Loader size={24} className="marketplace-upload-spinner" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="marketplace-upload-placeholder">
                        <Upload size={32} />
                        <span>Click to upload image</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={sellerReqFileRef}
                    onChange={handleSellerReqImageChange}
                    accept="image/*"
                    className="marketplace-file-input"
                  />
                </div>
              </div>

              {/* ── Section: Government Verification Documents ── */}
              <div className="seller-form-section">
                <div className="seller-form-section-title">
                  <Shield size={18} />
                  <span>Government Verification Documents</span>
                </div>
                <p className="seller-form-section-note">
                  All documents marked with * are mandatory for seller verification.
                </p>

                {/* Aadhaar Card */}
                <div className="seller-doc-group">
                  <div className="seller-doc-group-header">
                    <FileText size={16} />
                    <span>Aadhaar Card *</span>
                  </div>
                  <label>
                    <span>Aadhaar Number</span>
                    <input type="text" name="aadhaarNumber" required placeholder="XXXX XXXX XXXX" maxLength={14} />
                  </label>
                  <div className="marketplace-image-upload">
                    <span>Upload Aadhaar Card *</span>
                    <div 
                      className="marketplace-upload-box marketplace-upload-box-sm"
                      onClick={() => docFileRefs.aadhaar.current?.click()}
                    >
                      {docUrls.aadhaarDocument ? (
                        <div className="marketplace-upload-success">
                          <CheckCircle size={20} />
                          <span>Aadhaar uploaded</span>
                        </div>
                      ) : docUploading.aadhaar ? (
                        <div className="marketplace-upload-loading">
                          <Loader size={20} className="marketplace-upload-spinner" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="marketplace-upload-placeholder">
                          <Upload size={24} />
                          <span>Click to upload</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={docFileRefs.aadhaar}
                      onChange={(e) => handleDocumentUpload(e.target.files?.[0], 'aadhaar', 'aadhaarDocument')}
                      accept="image/*,.pdf"
                      className="marketplace-file-input"
                    />
                  </div>
                </div>

                {/* PAN Card */}
                <div className="seller-doc-group">
                  <div className="seller-doc-group-header">
                    <CreditCard size={16} />
                    <span>PAN Card *</span>
                  </div>
                  <label>
                    <span>PAN Number</span>
                    <input type="text" name="panNumber" required placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: 'uppercase' }} />
                  </label>
                  <div className="marketplace-image-upload">
                    <span>Upload PAN Card *</span>
                    <div 
                      className="marketplace-upload-box marketplace-upload-box-sm"
                      onClick={() => docFileRefs.pan.current?.click()}
                    >
                      {docUrls.panDocument ? (
                        <div className="marketplace-upload-success">
                          <CheckCircle size={20} />
                          <span>PAN uploaded</span>
                        </div>
                      ) : docUploading.pan ? (
                        <div className="marketplace-upload-loading">
                          <Loader size={20} className="marketplace-upload-spinner" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="marketplace-upload-placeholder">
                          <Upload size={24} />
                          <span>Click to upload</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={docFileRefs.pan}
                      onChange={(e) => handleDocumentUpload(e.target.files?.[0], 'pan', 'panDocument')}
                      accept="image/*,.pdf"
                      className="marketplace-file-input"
                    />
                  </div>
                </div>

                {/* GST Registration */}
                <div className="seller-doc-group">
                  <div className="seller-doc-group-header">
                    <Building2 size={16} />
                    <span>GST Registration *</span>
                  </div>
                  <label>
                    <span>GSTIN Number</span>
                    <input type="text" name="gstNumber" required placeholder="22AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
                  </label>
                </div>

                {/* Business License (optional) */}
                <div className="seller-doc-group">
                  <div className="seller-doc-group-header">
                    <Store size={16} />
                    <span>Business / Trade License</span>
                    <span className="seller-doc-optional">Optional</span>
                  </div>
                  <label>
                    <span>License Number</span>
                    <input type="text" name="businessLicenseNumber" placeholder="License number (if applicable)" />
                  </label>
                  <div className="marketplace-image-upload">
                    <span>Upload License Document</span>
                    <div 
                      className="marketplace-upload-box marketplace-upload-box-sm"
                      onClick={() => docFileRefs.businessLicense.current?.click()}
                    >
                      {docUrls.businessLicenseDocument ? (
                        <div className="marketplace-upload-success">
                          <CheckCircle size={20} />
                          <span>License uploaded</span>
                        </div>
                      ) : docUploading.businessLicense ? (
                        <div className="marketplace-upload-loading">
                          <Loader size={20} className="marketplace-upload-spinner" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="marketplace-upload-placeholder">
                          <Upload size={24} />
                          <span>Click to upload</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={docFileRefs.businessLicense}
                      onChange={(e) => handleDocumentUpload(e.target.files?.[0], 'businessLicense', 'businessLicenseDocument')}
                      accept="image/*,.pdf"
                      className="marketplace-file-input"
                    />
                  </div>
                </div>

                {/* Bank Account (optional) */}
                <div className="seller-doc-group">
                  <div className="seller-doc-group-header">
                    <Landmark size={16} />
                    <span>Bank Account Proof</span>
                    <span className="seller-doc-optional">Optional</span>
                  </div>
                  <div className="marketplace-image-upload">
                    <span>Upload Cancelled Cheque / Passbook</span>
                    <div 
                      className="marketplace-upload-box marketplace-upload-box-sm"
                      onClick={() => docFileRefs.bankAccount.current?.click()}
                    >
                      {docUrls.bankAccountDocument ? (
                        <div className="marketplace-upload-success">
                          <CheckCircle size={20} />
                          <span>Bank doc uploaded</span>
                        </div>
                      ) : docUploading.bankAccount ? (
                        <div className="marketplace-upload-loading">
                          <Loader size={20} className="marketplace-upload-spinner" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="marketplace-upload-placeholder">
                          <Upload size={24} />
                          <span>Click to upload</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={docFileRefs.bankAccount}
                      onChange={(e) => handleDocumentUpload(e.target.files?.[0], 'bankAccount', 'bankAccountDocument')}
                      accept="image/*,.pdf"
                      className="marketplace-file-input"
                    />
                  </div>
                </div>
              </div>

              <div className="marketplace-modal-actions">
                <button type="button" className="marketplace-modal-cancel" onClick={resetSellerRequestForm}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="marketplace-modal-submit" 
                  disabled={sellerReqUploading || Object.values(docUploading).some(Boolean)}
                >
                  <Shield size={18} />
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {purchaseToast && (
        <div className={`marketplace-toast ${purchaseToast.type === 'error' ? 'marketplace-toast-error' : ''}`}>
          {purchaseToast.text}
        </div>
      )}
    </div>
  );
}
