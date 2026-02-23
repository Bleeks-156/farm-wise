import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, Sprout, CalendarDays, Send, Info, Search, Loader, ChevronDown, History, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/advisory-chat.css';
import API_BASE from '../config/api';

export default function AdvisoryChat() {
  const location = useLocation();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const productContext = location.state?.productContext;

  // Format product context for display
  const getProductContextText = () => {
    if (!productContext) return null;
    if (typeof productContext === 'string') return productContext;
    return `${productContext.name} (₹${productContext.price}) - ${productContext.category}`;
  };

  const getInitialMessage = () => {
    if (productContext) {
      const productName = typeof productContext === 'string' ? productContext : productContext.name;
      return `Hi! I see you're asking about **${productName}**. Please fill in the context fields below (crop type, growth stage, location) so I can give you personalized advice about this product for your specific situation.`;
    }
    return 'Hi, I am the FarmWise AI assistant. Tell me about your crop, what you see in the field, and where you are located.';
  };

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: getInitialMessage(),
      explanation: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState({
    crop: '',
    stage: '',
    location: '',
    season: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [typingMessage, setTypingMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // Chat history state
  const [currentChatId, setCurrentChatId] = useState(chatId || null);
  const [chatList, setChatList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Auth headers helper
  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  // Fetch chat list for sidebar
  const fetchChatList = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`${API_BASE}/api/chat-history`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setChatList(data.chats);
    } catch (err) {
      console.error('Failed to fetch chat list:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token, authHeaders]);

  // Load an existing chat session
  const loadChat = useCallback(async (id) => {
    if (!token || !id) return;
    try {
      setIsLoadingChat(true);
      const res = await fetch(`${API_BASE}/api/chat-history/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const chat = data.chat;
        setCurrentChatId(chat.id);
        setContext(chat.context || { crop: '', stage: '', location: '', season: '' });
        // Rebuild messages from saved data
        const loadedMessages = chat.messages.map((m, i) => ({
          id: i + 1,
          role: m.role,
          text: m.text,
          explanation: m.explanation || null,
        }));
        setMessages(loadedMessages.length > 0 ? loadedMessages : [{
          id: 1, role: 'assistant', text: getInitialMessage(), explanation: null
        }]);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setIsLoadingChat(false);
    }
  }, [token, authHeaders]);

  // Create a new chat session on the backend
  const createChatSession = useCallback(async () => {
    if (!token) return null;
    try {
      const initialMsg = { role: 'assistant', text: getInitialMessage(), explanation: null };
      const res = await fetch(`${API_BASE}/api/chat-history`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: 'New Chat',
          context,
          messages: [initialMsg],
          productContext: productContext || null
        })
      });
      const data = await res.json();
      if (data.success) {
        const newId = data.chat.id;
        setCurrentChatId(newId);
        // Update URL so the chatId survives page refresh
        navigate(`/advisory/chat/${newId}`, { replace: true });
        fetchChatList();
        return newId;
      }
    } catch (err) {
      console.error('Failed to create chat session:', err);
    }
    return null;
  }, [token, authHeaders, context, productContext, fetchChatList, navigate]);

  // Save messages to the current chat session
  const saveMessages = useCallback(async (chatSessionId, newMessages) => {
    if (!token || !chatSessionId) return;
    try {
      await fetch(`${API_BASE}/api/chat-history/${chatSessionId}/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages: newMessages })
      });
      fetchChatList();
    } catch (err) {
      console.error('Failed to save messages:', err);
    }
  }, [token, authHeaders, fetchChatList]);

  // Update context on the backend
  const saveContext = useCallback(async (chatSessionId, newContext) => {
    if (!token || !chatSessionId) return;
    try {
      await fetch(`${API_BASE}/api/chat-history/${chatSessionId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ context: newContext })
      });
    } catch (err) {
      console.error('Failed to save context:', err);
    }
  }, [token, authHeaders]);

  // Delete a chat session
  const deleteChat = async (id) => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat-history/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setChatList(prev => prev.filter(c => c.id !== id));
        if (currentChatId === id) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Start a brand new chat
  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([{ id: 1, role: 'assistant', text: getInitialMessage(), explanation: null }]);
    setContext({ crop: '', stage: '', location: '', season: '' });
    navigate('/advisory/chat');
  };

  // Switch to an existing chat
  const handleSelectChat = (id) => {
    navigate(`/advisory/chat/${id}`);
    loadChat(id);
    setShowHistory(false);
  };

  // On mount: load chat if chatId param exists, otherwise fetch list
  useEffect(() => {
    if (chatId && token) {
      loadChat(chatId);
    }
    if (token) {
      fetchChatList();
    }
  }, [chatId, token]);

  // Clean and format text professionally
  const formatText = (text) => {
    if (!text) return null;
    
    // Remove any markdown symbols that might slip through
    let cleanText = text
      .replace(/\*\*/g, '')  // Remove **
      .replace(/\*/g, '')    // Remove *
      .replace(/#{1,6}\s/g, '') // Remove # headers
      .replace(/`/g, '')     // Remove backticks
      .trim();
    
    // Split by double newlines for paragraphs
    const paragraphs = cleanText.split(/\n\n+/);
    
    return paragraphs.map((para, pIndex) => {
      // Handle numbered lists (1. 2. 3.)
      if (/^\d+\.\s/.test(para.trim())) {
        const items = para.split(/\n/).filter(line => /^\d+\.\s/.test(line.trim()));
        if (items.length > 0) {
          return (
            <ol key={pIndex} className="advice-list">
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^\d+\.\s*/, '').trim()}</li>
              ))}
            </ol>
          );
        }
      }
      
      // Handle bullet points
      if (/^[-•]\s/.test(para.trim())) {
        const items = para.split(/\n/).filter(line => /^[-•]\s/.test(line.trim()));
        if (items.length > 0) {
          return (
            <ul key={pIndex} className="advice-list">
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^[-•]\s*/, '').trim()}</li>
              ))}
            </ul>
          );
        }
      }
      
      // Regular paragraph - also handle single line breaks
      const lines = para.split(/\n/).filter(Boolean);
      if (lines.length > 1) {
        return (
          <p key={pIndex}>
            {lines.map((line, i) => (
              <span key={i}>
                {line.trim()}
                {i < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      }
      
      return <p key={pIndex}>{para.trim()}</p>;
    });
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMessage]);
  
  // Location search state
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Growth stage options
  const growthStages = [
    { value: '', label: 'Select growth stage' },
    { value: 'germination', label: 'Germination / Sprouting' },
    { value: 'seedling', label: 'Seedling' },
    { value: 'vegetative', label: 'Vegetative Growth' },
    { value: 'flowering', label: 'Flowering' },
    { value: 'fruiting', label: 'Fruiting / Pod Formation' },
    { value: 'maturity', label: 'Maturity / Ripening' },
    { value: 'harvest', label: 'Harvest Ready' },
    { value: 'post-harvest', label: 'Post-Harvest' },
  ];

  // Search location using Open-Meteo Geocoding API
  const searchLocation = async (query) => {
    if (!query || query.length < 2) {
      setLocationResults([]);
      return;
    }

    try {
      setIsSearchingLocation(true);
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      
      if (!response.ok) throw new Error('Failed to search location');
      const data = await response.json();
      
      setLocationResults(data.results || []);
    } catch (err) {
      console.error('Location search error:', err);
      setLocationResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Determine season based on location and weather
  const determineSeasonFromWeather = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`
      );
      
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      
      const temp = data.current.temperature_2m;
      const humidity = data.current.relative_humidity_2m;
      const precipitation = data.current.precipitation || 0;
      
      // Determine season based on Indian agricultural seasons
      const month = new Date().getMonth() + 1; // 1-12
      let season = '';
      
      // Indian cropping seasons
      if (month >= 6 && month <= 9) {
        season = 'Kharif (Monsoon)';
        if (humidity > 80) season += ', Very Humid';
        if (precipitation > 0) season += ', Rainy';
      } else if (month >= 10 && month <= 2) {
        season = 'Rabi (Winter)';
        if (temp < 15) season += ', Cold';
        else if (temp < 25) season += ', Cool';
      } else {
        season = 'Zaid (Summer)';
        if (temp > 35) season += ', Hot';
        else if (temp > 30) season += ', Warm';
      }
      
      // Add humidity info
      if (humidity > 70 && !season.includes('Humid')) {
        season += ', Humid';
      } else if (humidity < 40) {
        season += ', Dry';
      }
      
      return season;
    } catch (err) {
      console.error('Weather fetch error:', err);
      return '';
    }
  };

  // Handle location selection
  const handleLocationSelect = async (result) => {
    const locationName = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;
    
    setSelectedLocation(result);
    setContext((prev) => ({ ...prev, location: locationName }));
    setLocationQuery('');
    setLocationResults([]);
    
    // Auto-fill season based on weather
    const season = await determineSeasonFromWeather(result.latitude, result.longitude);
    if (season) {
      setContext((prev) => ({ ...prev, season }));
    }
  };

  // Debounce location search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationQuery) {
        searchLocation(locationQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [locationQuery]);

  const handleChangeContext = (field, value) => {
    setContext((prev) => {
      const updated = { ...prev, [field]: value };
      // Persist context to backend if chat session exists
      if (currentChatId) saveContext(currentChatId, updated);
      return updated;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Build the new user message and conversation history snapshot
    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: input.trim(),
    };
    const conversationHistory = [...messages, userMessage];

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    // Ensure we have a chat session (create one if first message)
    let sessionId = currentChatId;
    if (!sessionId) {
      sessionId = await createChatSession();
    }

    try {
      // Because Vite is proxying /api -> backend (see vite.config.js),
      // we can call the backend route directly with a relative URL.
      const response = await fetch(`${API_BASE}/api/advisory/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          context,
          conversationHistory,
          productContext: productContext || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();

      const fullText = data.response ||
        'I could not generate a detailed response, but your message was received by the FarmWise advisory service.';
      const fullExplanation = data.explanation ||
        'This recommendation is generated automatically based on the crop, stage, location, and season details you provided.';

      // Typing animation effect
      const aiMessageId = Date.now() + 1;
      setTypingMessage({ id: aiMessageId, role: 'assistant', text: '', explanation: null, isTyping: true });
      
      // Animate text appearance
      let charIndex = 0;
      const typingSpeed = 8; // ms per character
      
      const typeText = () => {
        if (charIndex <= fullText.length) {
          setTypingMessage({
            id: aiMessageId,
            role: 'assistant',
            text: fullText.slice(0, charIndex),
            explanation: null,
            isTyping: true
          });
          charIndex++;
          setTimeout(typeText, typingSpeed);
        } else {
          // Finished typing main text, now show explanation with fade
          setTypingMessage(null);
          setMessages((prev) => [...prev, {
            id: aiMessageId,
            role: 'assistant',
            text: fullText,
            explanation: fullExplanation,
          }]);

          // Save both user and AI messages to the backend
          if (sessionId) {
            saveMessages(sessionId, [
              { role: 'user', text: userMessage.text },
              { role: 'assistant', text: fullText, explanation: fullExplanation }
            ]);
          }
        }
      };
      
      typeText();
    } catch (error) {
      console.error('Advisory chat error:', error);
      const errorMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        text: 'Sorry, I could not reach the FarmWise advisory service right now.',
        explanation:
          'There was a problem contacting the backend AI service. Please check that the backend server is running on port 5000 and try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="page-fade advisory-chat-page">
      <div className="container advisory-chat-layout">
        {/* Left: context form + info */}
        <aside className="advisory-chat-sidebar">
          <h1 className="advisory-chat-title">Start your advisory session</h1>
          <p className="advisory-chat-subtitle">
            Share basic context once, then ask follow‑up questions in the chat. The assistant uses this
            information to give <strong>context‑aware and explainable</strong> recommendations.
          </p>

          {/* Product Context Banner */}
          {productContext && (
            <div className="advisory-product-context">
              <div className="advisory-product-context-header">
                <MessageCircle size={18} />
                <span>Asking about product</span>
              </div>
              <div className="advisory-product-context-body">
                <h3>{typeof productContext === 'string' ? productContext : productContext.name}</h3>
                {typeof productContext !== 'string' && (
                  <>
                    <p className="product-price">₹{productContext.price}</p>
                    <p className="product-category">{productContext.category}</p>
                    {productContext.seller && <p className="product-seller">Seller: {productContext.seller}</p>}
                  </>
                )}
              </div>
              <p className="advisory-product-hint">Fill in the context fields below to get personalized advice for this product.</p>
            </div>
          )}

          <div className="advisory-chat-context">
            <h2 className="advisory-chat-heading">Field context</h2>
            <div className="advisory-chat-context-grid">
              <label className="advisory-chat-field">
                <span className="advisory-chat-label">
                  <Sprout size={16} />
                  Crop
                </span>
                <input
                  type="text"
                  placeholder="e.g. Tomato, தக்காளி, टमाटर, టమాటో"
                  value={context.crop}
                  onChange={(e) => handleChangeContext('crop', e.target.value)}
                />
                <span className="advisory-chat-field-hint">English, Tamil, Hindi, Telugu supported</span>
              </label>

              <label className="advisory-chat-field">
                <span className="advisory-chat-label">
                  <CalendarDays size={16} />
                  Growth stage
                </span>
                <div className="advisory-chat-select-wrapper">
                  <select
                    value={context.stage}
                    onChange={(e) => handleChangeContext('stage', e.target.value)}
                    className="advisory-chat-select"
                  >
                    {growthStages.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="advisory-chat-select-icon" />
                </div>
              </label>

              <div className="advisory-chat-field">
                <span className="advisory-chat-label">
                  <MapPin size={16} />
                  Location / village
                </span>
                <div className="advisory-chat-location-wrapper">
                  <Search size={16} className="advisory-chat-location-icon" />
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="advisory-chat-location-input"
                  />
                  {isSearchingLocation && <Loader size={16} className="advisory-chat-location-loader" />}
                  {locationResults.length > 0 && (
                    <ul className="advisory-chat-location-results">
                      {locationResults.map((result, index) => (
                        <li
                          key={index}
                          onClick={() => handleLocationSelect(result)}
                          className="advisory-chat-location-result-item"
                        >
                          <MapPin size={14} />
                          <span>
                            {result.name}
                            {result.admin1 && `, ${result.admin1}`}
                            {result.country && `, ${result.country}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {context.location && (
                  <div className="advisory-chat-selected-location">
                    <MapPin size={14} />
                    <span>{context.location}</span>
                  </div>
                )}
              </div>

              <label className="advisory-chat-field">
                <span className="advisory-chat-label">
                  <CalendarDays size={16} />
                  Season / conditions
                </span>
                <input
                  type="text"
                  placeholder="Auto-filled based on location"
                  value={context.season}
                  onChange={(e) => handleChangeContext('season', e.target.value)}
                  className="advisory-chat-season-input"
                />
                <span className="advisory-chat-field-hint">Auto-filled when you select a location</span>
              </label>
            </div>

            <div className="advisory-chat-hint">
              <Info size={14} />
              <p>
                These details help FarmWise estimate disease pressure, input needs, and timing so that advice
                is tailored to your local conditions.
              </p>
            </div>
          </div>
        </aside>

        {/* Right: chat window */}
        <section className="advisory-chat-main">
          <header className="advisory-chat-header-bar">
            <div className="advisory-chat-header-title">
              <MessageCircle size={20} />
              <div>
                <h2>FarmWise Assistant</h2>
                <p>
                  Ask about symptoms, fertilizer plans, or pest management. Each answer includes a short
                  explanation.
                </p>
              </div>
            </div>
            <div className="advisory-chat-header-actions">
              <button className="chat-header-btn" onClick={handleNewChat} title="New Chat">
                <Plus size={16} />
              </button>
              <button
                className={`chat-header-btn ${showHistory ? 'chat-header-btn-active' : ''}`}
                onClick={() => setShowHistory(prev => !prev)}
                title="Chat History"
              >
                <History size={16} />
                {chatList.length > 0 && <span className="chat-header-badge">{chatList.length}</span>}
              </button>
            </div>
          </header>

          {/* Collapsible Chat History Dropdown */}
          {showHistory && (
            <div className="chat-history-dropdown">
              <div className="chat-history-dropdown-header">
                <span>Recent Conversations</span>
                <button className="chat-history-new-btn" onClick={() => { handleNewChat(); setShowHistory(false); }}>
                  <Plus size={14} />
                  New Chat
                </button>
              </div>
              <div className="chat-history-dropdown-list">
                {isLoadingHistory ? (
                  <div className="chat-history-loading"><Loader size={16} className="spin" /> Loading...</div>
                ) : chatList.length === 0 ? (
                  <p className="chat-history-empty">No previous chats yet.</p>
                ) : (
                  chatList.map((chat) => (
                    <div
                      key={chat.id}
                      className={`chat-history-item ${currentChatId === chat.id ? 'chat-history-item-active' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="chat-history-item-content">
                        <span className="chat-history-item-title">{chat.title}</span>
                        <span className="chat-history-item-meta">
                          <Clock size={12} />
                          {new Date(chat.updatedAt).toLocaleDateString()}
                          {chat.crop && ` · ${chat.crop}`}
                        </span>
                      </div>
                      <button
                        className="chat-history-item-delete"
                        onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                        title="Delete chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="advisory-chat-window">
            <div className="advisory-chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`advisory-chat-bubble-row ${
                    msg.role === 'user' ? 'advisory-chat-row-user' : 'advisory-chat-row-ai'
                  }`}
                >
                  <div
                    className={`advisory-chat-bubble advisory-chat-bubble-${msg.role}`}
                  >
                    <div className="advisory-chat-text">
                      {msg.role === 'assistant' ? formatText(msg.text) : <p>{msg.text}</p>}
                    </div>
                    {msg.explanation && (
                      <div className="advisory-chat-explanation-block fade-in">
                        <span className="advisory-chat-explanation-label">Why this advice?</span>
                        <div className="advisory-chat-explanation-text">
                          {formatText(msg.explanation)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing animation message */}
              {typingMessage && (
                <div className="advisory-chat-bubble-row advisory-chat-row-ai">
                  <div className="advisory-chat-bubble advisory-chat-bubble-assistant typing-bubble">
                    <div className="advisory-chat-text">
                      {formatText(typingMessage.text)}
                      <span className="typing-cursor">|</span>
                    </div>
                  </div>
                </div>
              )}

              {isSending && !typingMessage && (
                <div className="advisory-chat-bubble-row advisory-chat-row-ai">
                  <div className="advisory-chat-bubble advisory-chat-bubble-ai advisory-chat-typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="advisory-chat-input-bar" onSubmit={handleSend}>
              <textarea
                rows={2}
                placeholder="Describe what you see in the field, then ask your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isSending) {
                      handleSend(e);
                    }
                  }
                }}
              />
              <button type="submit" disabled={isSending || !input.trim()}>
                <Send size={18} />
                <span>Send</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

