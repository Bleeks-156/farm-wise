import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import emailjs from '@emailjs/browser';
import { CheckCircle, Package, ArrowLeft, Loader, AlertCircle, Mail, MailCheck, MailX } from 'lucide-react';
import '../styles/payment-success.css';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Initialize EmailJS with public key
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | sent | failed
  const emailSentRef = useRef(false);

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (sessionId && token) {
      verifyPayment();
    }
  }, [sessionId, token]);

  const sendReceiptEmail = async (orderData) => {
    // Prevent duplicate sends
    if (emailSentRef.current) return;
    emailSentRef.current = true;

    setEmailStatus('sending');

    try {
      const templateParams = {
        to_email: user?.email || '',
        to_name: user?.name || 'Customer',
        order_id: orderData.id?.slice(-8).toUpperCase() || '',
        product_name: orderData.product?.name || 'Product',
        quantity: String(orderData.quantity || 1),
        total_amount: orderData.totalAmount?.toLocaleString('en-IN') || '0',
        order_date: new Date(orderData.createdAt || Date.now()).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        order_status: orderData.orderStatus
          ? orderData.orderStatus.charAt(0).toUpperCase() + orderData.orderStatus.slice(1)
          : 'Confirmed',
      };

      console.log('📧 Sending email with:', { serviceId: EMAILJS_SERVICE_ID, templateId: EMAILJS_TEMPLATE_ID, params: templateParams });

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

      console.log('✅ EmailJS response:', response);
      setEmailStatus('sent');
      console.log('✅ Receipt email sent successfully to', user?.email);
    } catch (err) {
      console.error('❌ Failed to send receipt email:', err);
      console.error('❌ Error details:', JSON.stringify(err, null, 2));
      setEmailStatus('failed');
    }
  };

  const verifyPayment = async () => {
    try {
      const response = await fetch(`/api/payment/verify/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOrder(data.order);

        // Send receipt email after successful payment verification
        if (data.order && data.paymentStatus === 'paid') {
          sendReceiptEmail(data.order);
        }
      } else {
        setError(data.error || 'Failed to verify payment');
      }
    } catch (err) {
      setError('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    if (order) {
      emailSentRef.current = false;
      sendReceiptEmail(order);
    }
  };

  if (loading) {
    return (
      <div className="payment-success-page">
        <div className="payment-success-card">
          <div className="payment-loading-container">
            <Loader size={40} className="spinner" />
            <p>Verifying your payment...</p>
          </div>
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
        {/* Animated Success Icon */}
        <div className="payment-success-icon-wrapper">
          <div className="payment-success-icon">
            <CheckCircle size={56} />
          </div>
          <div className="success-ring"></div>
        </div>

        <h1>Payment Successful!</h1>
        <p className="payment-success-subtitle">
          Thank you for your purchase. Your order has been confirmed.
        </p>

        {/* Email Status Banner */}
        <div className={`email-status-banner email-status-${emailStatus}`}>
          {emailStatus === 'sending' && (
            <>
              <Loader size={16} className="spinner" />
              <span>Sending receipt to {user?.email}...</span>
            </>
          )}
          {emailStatus === 'sent' && (
            <>
              <MailCheck size={16} />
              <span>Receipt sent to {user?.email}</span>
            </>
          )}
          {emailStatus === 'failed' && (
            <>
              <MailX size={16} />
              <span>Failed to send receipt</span>
              <button onClick={handleResendEmail} className="resend-btn">
                Resend
              </button>
            </>
          )}
        </div>

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
