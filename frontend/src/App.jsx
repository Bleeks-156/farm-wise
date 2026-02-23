import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Advisory from './pages/Advisory';
import AdvisoryChat from './pages/AdvisoryChat';
import Marketplace from './pages/Marketplace';
import ProductDetails from './pages/ProductDetails';
import SellerDetails from './pages/SellerDetails';
import Weather from './pages/Weather';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PaymentSuccess from './pages/PaymentSuccess';
import Cart from './pages/Cart';
import './styles/footer.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Navbar />
      <main style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
          <Route 
            path="/advisory" 
            element={
              <ProtectedRoute>
                <Advisory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/advisory/chat" 
            element={
              <ProtectedRoute>
                <AdvisoryChat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/advisory/chat/:chatId" 
            element={
              <ProtectedRoute>
                <AdvisoryChat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/marketplace" 
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/marketplace/product/:id" 
            element={<ProductDetails />} 
          />
          <Route 
            path="/marketplace/seller/:id" 
            element={
              <ProtectedRoute>
                <SellerDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/weather" 
            element={
              <ProtectedRoute>
                <Weather />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment/success" 
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <p className="footer-text">© 2026 FarmWise. Empowering farmers with clinical-grade agricultural intelligence.</p>
          </div>
        </div>
      </footer>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;