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

function triggerGoogleTranslate(langCode) {
    // Google Translate uses a hidden <select> element — find and change it
    const frame = document.querySelector('.goog-te-combo');
    if (frame) {
        frame.value = langCode;
        frame.dispatchEvent(new Event('change'));
    }
}

function getCurrentLanguage() {
    // Check Google Translate cookie
    const match = document.cookie.match(/googtrans=\/en\/([a-z-]+)/i);
    return match ? match[1] : 'en';
}

export default function LanguageSelector() {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState('en');
    const ref = useRef(null);

    useEffect(() => {
        setCurrent(getCurrentLanguage());
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (code) => {
        if (code === 'en') {
            // Reset to English — remove the google translate cookie
            document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
            document.cookie = 'googtrans=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
            window.location.reload();
        } else {
            triggerGoogleTranslate(code);
            setCurrent(code);
        }
        setOpen(false);
    };

    const currentLang = LANGUAGES.find(l => l.code === current) || LANGUAGES[0];

    return (
        <div className="lang-selector" ref={ref}>
            <button
                type="button"
                className="lang-selector-btn"
                onClick={() => setOpen(v => !v)}
                aria-label="Select language"
                title="Translate page"
            >
                <Globe size={18} className="lang-globe-icon" />
                <span className="lang-current-flag">{currentLang.flag}</span>
                <ChevronDown size={14} className={`lang-chevron ${open ? 'lang-chevron-open' : ''}`} />
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
