import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import '../styles/language-selector.css';

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
];

/**
 * Get the currently active Google Translate language from cookies.
 */
function getCurrentLang() {
    const match = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/);
    return match ? match[1] : 'en';
}

/**
 * Set the Google Translate cookie and trigger translation.
 * Uses two approaches for reliability:
 *  1. Cookie-based (works on reload)
 *  2. Direct select manipulation (works without reload)
 */
function setLanguage(langCode) {
    if (langCode === 'en') {
        // Clear translation — remove cookies and reload
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        window.location.reload();
        return;
    }

    // Set the googtrans cookie (for both domain variants)
    const cookieVal = `/en/${langCode}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=.${window.location.hostname};`;

    // Try to use the Google Translate combo box directly (no reload needed)
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event('change'));
    } else {
        // Fallback: reload to pick up the cookie
        window.location.reload();
    }
}

export default function LanguageSelector() {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState('en');
    const [gtReady, setGtReady] = useState(false);
    const ref = useRef(null);

    // Detect current language on mount
    useEffect(() => {
        setCurrent(getCurrentLang());

        // Poll for Google Translate readiness
        const check = setInterval(() => {
            if (document.querySelector('.goog-te-combo')) {
                setGtReady(true);
                clearInterval(check);
            }
        }, 500);

        return () => clearInterval(check);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (code) => {
        setCurrent(code);
        setOpen(false);
        setLanguage(code);
    };

    const currentLang = LANGUAGES.find(l => l.code === current) || LANGUAGES[0];

    return (
        <div className="lang-selector" ref={ref}>
            <button
                type="button"
                className="lang-selector-btn"
                onClick={() => setOpen(v => !v)}
                aria-label="Select language"
                title={`Language: ${currentLang.name}`}
            >
                <Globe size={20} className="lang-globe-icon" />
            </button>

            {open && (
                <div className="lang-dropdown">
                    <div className="lang-dropdown-header">
                        <Globe size={16} />
                        <span>Translate Page</span>
                    </div>
                    <div className="lang-dropdown-list">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                className={`lang-option ${current === lang.code ? 'lang-option-active' : ''}`}
                                onClick={() => handleSelect(lang.code)}
                            >
                                <span className="lang-option-flag">{lang.flag}</span>
                                <span className="lang-option-name">{lang.name}</span>
                                {current === lang.code && <Check size={14} className="lang-option-check" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
