import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Brain, Languages, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/advisory.css';

export default function Advisory() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    document.body.classList.add('has-video-bg');
    return () => {
      document.body.classList.remove('has-video-bg');
    };
  }, []);

  return (
    <div className="page-fade advisory-page">
      {/* Video Background */}
      <div className="advisory-video-bg">
        <video
          key={theme}
          autoPlay
          loop
          muted
          playsInline
          className="advisory-video"
        >
          <source src={theme === 'light' ? '/Adv-L.mp4?v=2' : '/Adv-N.mp4?v=2'} type="video/mp4" />
        </video>
        <div className="advisory-video-overlay"></div>
      </div>

      {/* Hero / Overview */}
      <section className="advisory-hero">
        <div className="advisory-hero-content container">
          <div className="advisory-hero-text">
            <h1 className="advisory-title">AI Advisory, Built for Smallholder Farmers</h1>
            <p className="advisory-subtitle">
              FarmWise turns your field questions into clear, trustworthy guidance. 
              Every recommendation is tailored to your location, season, and crop growth stage – 
              and comes with a simple explanation of <strong>why</strong> it is being suggested.
            </p>
            <div className="advisory-hero-highlights">
              <span className="advisory-pill">Context‑aware</span>
              <span className="advisory-pill">Explainable</span>
              <span className="advisory-pill">Multilingual</span>
            </div>
            <div className="advisory-hero-cta">
              <button
                className="advisory-primary-btn"
                type="button"
                onClick={() => navigate('/advisory/chat')}
              >
                Start an advisory session
                <ArrowRight size={18} className="advisory-primary-icon" />
              </button>
              <p className="advisory-hero-note">
                Prototype mode – responses are powered by Google Gemini and may reference nearby marketplace options.
              </p>
            </div>
          </div>

          <div className="advisory-hero-panel">
            <div className="advisory-chat-preview">
              <div className="advisory-chat-header">
                <MessageCircle size={20} />
                <span>FarmWise Assistant</span>
              </div>
              <div className="advisory-chat-body">
                <div className="advisory-chat-bubble user">
                  I see brown spots on my tomato leaves. What should I do?
                </div>
                <div className="advisory-chat-bubble ai">
                  Based on your location (rainy season) and tomato growth stage, this looks like early blight.
                  I recommend a copper‑based fungicide and removing heavily affected leaves.
                  <span className="advisory-chat-label">Why this advice?</span>
                  <span className="advisory-chat-explanation">
                    The pattern of spots and current humidity levels increase fungal risk. 
                    Copper controls the pathogen while pruning reduces spread to healthy leaves.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="advisory-section">
        <div className="container">
          <h2 className="advisory-section-title">What the AI Advisory System Can Do</h2>
          <p className="advisory-section-intro">
            The AI advisory engine combines agronomic knowledge with local context to give you
            recommendations that feel like they come from an expert who knows your farm.
          </p>
          <div className="advisory-grid">
            <article className="advisory-card">
              <div className="advisory-card-icon">
                <Brain size={28} />
              </div>
              <h3>Context‑Aware Decisions</h3>
              <p>
                Recommendations adapt to your <strong>location, season, and crop growth stage</strong>.
                The same problem in a different village or month can trigger a different, more accurate plan.
              </p>
            </article>

            <article className="advisory-card">
              <div className="advisory-card-icon">
                <ShieldCheck size={28} />
              </div>
              <h3>Explainable Recommendations</h3>
              <p>
                Each advisory answer includes a short, plain‑language explanation describing the{" "}
                <strong>reasoning, trade‑offs, and risks</strong>, so farmers and extension workers can trust and verify the advice.
              </p>
            </article>

            <article className="advisory-card">
              <div className="advisory-card-icon">
                <MapPin size={28} />
              </div>
              <h3>Hyperlocal to Marketplace</h3>
              <p>
                After an advisory session, FarmWise can surface <strong>nearby verified suppliers</strong> 
                that stock the fertilizers, pesticides, or inputs recommended by the AI, closing the gap from
                decision to action.
              </p>
            </article>

            <article className="advisory-card">
              <div className="advisory-card-icon">
                <Languages size={28} />
              </div>
              <h3>Multilingual Conversations</h3>
              <p>
                Powered by the <strong>Google Gemini API</strong>, the assistant can hold conversations in
                multiple languages, making the platform accessible to diverse farmer communities.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="advisory-section advisory-section-alt">
        <div className="container">
          <h2 className="advisory-section-title">How a Typical Advisory Session Flows</h2>
          <div className="advisory-steps">
            <div className="advisory-step">
              <span className="advisory-step-number">1</span>
              <div className="advisory-step-content">
                <h3>Describe Your Field Context</h3>
                <p>
                  Share your crop type, age, visible symptoms, and optionally allow location access so
                  FarmWise can understand the <strong>local weather and seasonal conditions</strong>.
                </p>
              </div>
            </div>

            <div className="advisory-step">
              <span className="advisory-step-number">2</span>
              <div className="advisory-step-content">
                <h3>Receive Tailored, Explainable Advice</h3>
                <p>
                  The AI generates crop management, pest identification, or fertilizer guidance tailored to
                  your situation, along with a <strong>clear “why this” explanation</strong> so the logic is transparent.
                </p>
              </div>
            </div>

            <div className="advisory-step">
              <span className="advisory-step-number">3</span>
              <div className="advisory-step-content">
                <h3>Move Seamlessly to Action</h3>
                <p>
                  From the same interface, you can jump into the <strong>hyperlocal marketplace</strong> to
                  find verified suppliers that match the recommended inputs, helping you implement advice faster.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project / Evaluation Note */}
      <section className="advisory-section advisory-section-note">
        <div className="container">
          <h2 className="advisory-section-title">Designed for Clarity, Trust, and Learning</h2>
          <p className="advisory-section-intro">
            This AI advisory module is built as part of the FarmWise MERN‑stack prototype at the undergraduate level.
            Early user feedback highlights that <strong>transparent, context‑aware answers</strong> help farmers better
            understand each recommendation and feel more confident adopting it in the field.
          </p>
        </div>
      </section>
    </div>
  );
}

