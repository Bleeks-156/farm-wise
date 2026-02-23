import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Package, ArrowLeft, Loader, AlertCircle } from 'lucide-react';
import '../styles/product-details.css';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (sessionId && token) {
      verifyPayment();
    }
  }, [sessionId, token]);

  const verifyPayment = async () => {
    try {
      const response = await fetch(`/api/payment/verify/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Failed to verify payment');
      }
    } catch (err) {
      setError('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-success-page">
        <div className="payment-success-card">
          <Loader size={40} className="spinner" />
          <p>Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-success-page">
        <div className="payment-success-card payment-error-card">
          <AlertCircle size={48} />
          <h2>Payment Verification Failed</h2>
          <p>{error}</p>
          <Link to="/marketplace" className="payment-back-btn">
            <ArrowLeft size={18} />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-page">
      <div className="payment-success-card">
        <div className="payment-success-icon">
          <CheckCircle size={56} />
        </div>
        <h1>Payment Successful!</h1>
        <p className="payment-success-subtitle">
          Thank you for your purchase. Your order has been confirmed.
        </p>

        {order && (
          <div className="payment-order-details">
            <div className="payment-order-row">
              <span>Order ID</span>
              <strong>#{order.id?.slice(-8).toUpperCase()}</strong>
            </div>
            {order.product && (
              <div className="payment-order-row">
                <span>Product</span>
                <strong>{order.product.name}</strong>
              </div>
            )}
            <div className="payment-order-row">
              <span>Quantity</span>
              <strong>{order.quantity}</strong>
            </div>
            <div className="payment-order-row">
              <span>Total Paid</span>
              <strong className="payment-total">₹{order.totalAmount?.toLocaleString('en-IN')}</strong>
            </div>
            <div className="payment-order-row">
              <span>Status</span>
              <strong className="payment-status-confirmed">
                <CheckCircle size={14} />
                {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
              </strong>
            </div>
          </div>
        )}

        <div className="payment-success-actions">
          <Link to="/marketplace" className="payment-back-btn">
            <ArrowLeft size={18} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
