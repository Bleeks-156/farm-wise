import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Cloud, FlaskConical, Store } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/home.css';

export default function Home() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const cardRefs = useRef([]);

  useEffect(() => {
    const observers = cardRefs.current.map((ref, index) => {
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

    return () => {
      observers.forEach((observer) => observer && observer.disconnect());
    };
  }, []);

  const features = [
    { 
      title: "Weather Forecast", 
      desc: "Get real-time weather updates and 5-day forecasts for your location.", 
      icon: Cloud,
      image: "https://images.unsplash.com/photo-1592210454359-9043f067919b?w=600&h=400&fit=crop",
      link: "/weather"
    },
    { 
      title: "Diagnosis & Treatment", 
      desc: "Get fertilizer and management protocols tailored to your soil.", 
      icon: FlaskConical,
      image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&h=400&fit=crop",
      link: "/advisory"
    },
    { 
      title: "Find a Supplier", 
      desc: "Connect with verified hyperlocal marketplace vendors.", 
      icon: Store,
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop",
      link: "/marketplace"
    }
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

      {/* Search Hero */}
      <section className="home-hero">
        <div className="home-hero-background">
          <div className="home-hero-overlay"></div>
          <div className="home-hero-pattern"></div>
        </div>
        <div className="home-hero-content">
          <h1 className="home-hero-title animate-fade-in-up">
            <span className="home-hero-title-line">What can we help you</span>
            <span className="home-hero-title-accent">grow today?</span>
          </h1>
          <div className="home-search-container animate-fade-in-up-delay">
            <input 
              type="text" 
              placeholder="Search symptoms, pests, or crop advice..." 
              className="home-search-input"
            />
            <Search className="home-search-icon" size={25} />
          </div>
        </div>
      </section>

      {/* Grid Features */}
      <section className="home-features">
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
                  Learn More <ChevronRight size={16} className="home-feature-chevron" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}