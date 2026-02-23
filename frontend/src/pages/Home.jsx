import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Cloud, FlaskConical, Store, Leaf, ShieldCheck, Users, TrendingUp, Zap, Globe, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/home.css';

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const [visibleSections, setVisibleSections] = useState([]);
  const cardRefs = useRef([]);
  const sectionRefs = useRef([]);

  useEffect(() => {
    const cardObservers = cardRefs.current.map((ref, index) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setVisibleCards((prev) => [...prev, index]);
              }, index * 150);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );
      observer.observe(ref);
      return observer;
    });

    const sectionObservers = sectionRefs.current.map((ref, index) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleSections((prev) => [...prev, index]);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      observer.observe(ref);
      return observer;
    });

    return () => {
      cardObservers.forEach((o) => o && o.disconnect());
      sectionObservers.forEach((o) => o && o.disconnect());
    };
  }, []);

  const features = [
    { 
      title: "Weather Forecast", 
      desc: "Get real-time weather updates and 5-day forecasts tailored to your farming location.", 
      icon: Cloud,
      image: "https://images.unsplash.com/photo-1592210454359-9043f067919b?w=600&h=400&fit=crop",
      link: "/weather"
    },
    { 
      title: "AI Crop Advisory", 
      desc: "Get AI-powered diagnosis, fertilizer recommendations, and management protocols for your crops.", 
      icon: FlaskConical,
      image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&h=400&fit=crop",
      link: "/advisory"
    },
    { 
      title: "Marketplace", 
      desc: "Buy and sell seeds, fertilizers, tools, and produce from verified local vendors.", 
      icon: Store,
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop",
      link: "/marketplace"
    }
  ];

  const stats = [
    { value: "AI-Powered", label: "Crop Advisory", icon: Zap },
    { value: "Real-Time", label: "Weather Data", icon: Globe },
    { value: "Secure", label: "Marketplace", icon: ShieldCheck },
    { value: "24/7", label: "Available", icon: TrendingUp },
  ];

  const steps = [
    { step: "01", title: "Create Your Account", desc: "Sign up for free and set up your farming profile with your location and crop details." },
    { step: "02", title: "Get AI Insights", desc: "Ask our AI advisor about crop diseases, soil management, fertilizers, and best practices." },
    { step: "03", title: "Shop & Sell", desc: "Browse the marketplace for seeds, tools, and supplies — or become a seller yourself." },
  ];

  const whyUs = [
    { icon: Leaf, title: "Smart Farming", desc: "Leverage AI technology to make data-driven decisions for better crop yields." },
    { icon: ShieldCheck, title: "Trusted Platform", desc: "Verified sellers, secure payments via Stripe, and reliable product quality." },
    { icon: Users, title: "Community Driven", desc: "Connect with local farmers, share knowledge, and grow together." },
  ];

  return (
    <div className="page-fade">
      {/* Background Image */}
      <div className="home-background-image">
        <img 
          src={theme === 'light' ? '/home-L.jpg' : '/home-N.jpg'} 
          alt="Background" 
          className="home-bg-img"
          key={theme}
        />
        <div className="home-bg-overlay"></div>
      </div>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-background">
          <div className="home-hero-overlay"></div>
        </div>
        <div className="home-hero-content">
          <div className="home-hero-badge animate-fade-in-up">
            <Leaf size={14} />
            <span>Smart Agriculture Platform</span>
          </div>
          <h1 className="home-hero-title animate-fade-in-up">
            <span className="home-hero-title-line">Empowering Farmers with</span>
            <span className="home-hero-title-accent">Intelligent Solutions</span>
          </h1>
          <p className="home-hero-subtitle animate-fade-in-up-delay">
            AI-powered crop advisory, real-time weather forecasts, and a trusted marketplace — everything you need to grow smarter, all in one place.
          </p>
          <div className="home-hero-actions animate-fade-in-up-delay">
            {user ? (
              <>
                <button className="home-hero-btn home-hero-btn-primary" onClick={() => navigate('/advisory')}>
                  Get AI Advice <ArrowRight size={18} />
                </button>
                <button className="home-hero-btn home-hero-btn-secondary" onClick={() => navigate('/marketplace')}>
                  Browse Marketplace
                </button>
              </>
            ) : (
              <>
                <Link to="/register" className="home-hero-btn home-hero-btn-primary">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="home-hero-btn home-hero-btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section 
        className={`home-stats ${visibleSections.includes(0) ? 'home-section-visible' : ''}`}
        ref={(el) => (sectionRefs.current[0] = el)}
      >
        <div className="home-stats-grid">
          {stats.map((stat, i) => {
            const IconComp = stat.icon;
            return (
              <div key={i} className="home-stat-item">
                <IconComp size={24} className="home-stat-icon" />
                <div className="home-stat-text">
                  <span className="home-stat-value">{stat.value}</span>
                  <span className="home-stat-label">{stat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section className="home-features">
        <div className="home-section-header">
          <h2 className="home-section-title">What We Offer</h2>
          <p className="home-section-desc">Everything a modern farmer needs, powered by technology</p>
        </div>
        <div className="home-features-grid">
          {features.map((item, i) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={i} 
                ref={(el) => (cardRefs.current[i] = el)}
                className={`home-feature-card ${
                  hoveredCard === i ? 'home-feature-card-hovered' : ''
                } ${
                  visibleCards.includes(i) ? 'home-feature-card-visible' : 'home-feature-card-hidden'
                }`}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="home-feature-image-wrapper">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="home-feature-image"
                    loading="lazy"
                  />
                  <div className="home-feature-icon-wrapper">
                    <IconComponent className="home-feature-icon" size={32} />
                  </div>
                </div>
                <h3 className="home-feature-title">{item.title}</h3>
                <p className="home-feature-desc">{item.desc}</p>
                <button className="home-feature-button" onClick={() => navigate(item.link)}>
                  Explore <ChevronRight size={16} className="home-feature-chevron" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section 
        className={`home-how-it-works ${visibleSections.includes(1) ? 'home-section-visible' : ''}`}
        ref={(el) => (sectionRefs.current[1] = el)}
      >
        <div className="home-section-header">
          <h2 className="home-section-title">How It Works</h2>
          <p className="home-section-desc">Get started in three simple steps</p>
        </div>
        <div className="home-steps-grid">
          {steps.map((item, i) => (
            <div key={i} className="home-step-card">
              <span className="home-step-number">{item.step}</span>
              <h3 className="home-step-title">{item.title}</h3>
              <p className="home-step-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why FarmWise */}
      <section 
        className={`home-why ${visibleSections.includes(2) ? 'home-section-visible' : ''}`}
        ref={(el) => (sectionRefs.current[2] = el)}
      >
        <div className="home-section-header">
          <h2 className="home-section-title">Why FarmWise?</h2>
          <p className="home-section-desc">Built by farmers, for farmers</p>
        </div>
        <div className="home-why-grid">
          {whyUs.map((item, i) => {
            const IconComp = item.icon;
            return (
              <div key={i} className="home-why-card">
                <div className="home-why-icon-wrap">
                  <IconComp size={28} />
                </div>
                <h3 className="home-why-title">{item.title}</h3>
                <p className="home-why-desc">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section 
          className={`home-cta ${visibleSections.includes(3) ? 'home-section-visible' : ''}`}
          ref={(el) => (sectionRefs.current[3] = el)}
        >
          <div className="home-cta-content">
            <h2 className="home-cta-title">Ready to Transform Your Farming?</h2>
            <p className="home-cta-desc">Join FarmWise today and access AI-powered tools, real-time data, and a thriving marketplace.</p>
            <Link to="/register" className="home-hero-btn home-hero-btn-primary">
              Create Free Account <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}