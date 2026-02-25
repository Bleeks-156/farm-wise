import React, { useState, useRef } from 'react';
import {
    Upload, Leaf, AlertTriangle, CheckCircle2, Loader, X,
    ChevronDown, Microscope, ShieldAlert, FlaskConical, Info, RotateCcw,
} from 'lucide-react';
import '../styles/disease-scanner.css';

const DISEASE_API = import.meta.env.VITE_DISEASE_API_URL || '';

const CROP_OPTIONS = [
    { value: '', label: 'Auto-detect (no hint)' },
    { value: 'rice', label: 'Rice' },
    { value: 'corn', label: 'Corn / Maize' },
    { value: 'tomato', label: 'Tomato' },
    { value: 'potato', label: 'Potato' },
    { value: 'apple', label: 'Apple' },
    { value: 'grape', label: 'Grape' },
    { value: 'citrus', label: 'Orange / Lemon (Citrus)' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'pepper', label: 'Pepper' },
    { value: 'strawberry', label: 'Strawberry' },
    { value: 'tea', label: 'Tea' },
    { value: 'blueberry', label: 'Blueberry' },
    { value: 'peach', label: 'Peach' },
    { value: 'raspberry', label: 'Raspberry' },
    { value: 'soybean', label: 'Soybean' },
    { value: 'other', label: 'Other (Garlic / Ginger / Onion…)' },
];

export default function DiseaseScanner() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [cropHint, setCropHint] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFileSelect(e.dataTransfer.files?.[0]);
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setCropHint('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        if (!DISEASE_API) {
            setError('Disease API URL is not configured. Set VITE_DISEASE_API_URL in your .env file.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            if (cropHint) formData.append('crop', cropHint);

            const res = await fetch(`${DISEASE_API}/predict`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(
                err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
                    ? 'Could not reach the disease detection API. Check your VITE_DISEASE_API_URL and make sure the Render service is running.'
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    const confColor = (c) => c >= 85 ? '#16a34a' : c >= 70 ? '#f59e0b' : '#dc2626';
    const isHealthy = result?.predicted_class?.toLowerCase().includes('healthy');

    return (
        <div className="ds-page page-fade">
            {/* Animated background */}
            <div className="ds-bg">
                <div className="ds-blob ds-blob-1" />
                <div className="ds-blob ds-blob-2" />
                <div className="ds-blob ds-blob-3" />
            </div>

            <div className="container ds-container">
                {/* Header */}
                <div className="ds-header">
                    <div className="ds-header-icon"><Microscope size={32} /></div>
                    <h1 className="ds-title">Plant Disease Scanner</h1>
                    <p className="ds-subtitle">
                        Upload a clear photo of your crop leaf. Our AI model (99.8% accuracy)
                        detects diseases and provides treatment guidance instantly.
                    </p>
                </div>

                <div className="ds-layout">
                    {/* ── Left: Upload panel ── */}
                    <div className="ds-panel">
                        <div className="ds-panel-title"><Upload size={17} /> Upload Leaf Image</div>

                        {/* Drop zone */}
                        <div
                            className={`ds-dropzone${dragging ? ' ds-dropzone-drag' : ''}${previewUrl ? ' ds-dropzone-filled' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className="ds-preview" />
                                    <button type="button" className="ds-remove" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                                        <X size={15} />
                                    </button>
                                </>
                            ) : (
                                <div className="ds-placeholder">
                                    <div className="ds-placeholder-icon"><Leaf size={38} /></div>
                                    <p className="ds-placeholder-text">Drag & drop a leaf photo here</p>
                                    <p className="ds-placeholder-sub">or click to browse · JPG, PNG, WEBP</p>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef} type="file" accept="image/*"
                            className="ds-hidden" onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />

                        {/* Crop hint */}
                        <div className="ds-field">
                            <label className="ds-label"><Leaf size={14} /> Crop Hint (optional — improves accuracy)</label>
                            <div className="ds-select-wrap">
                                <select className="ds-select" value={cropHint} onChange={(e) => setCropHint(e.target.value)}>
                                    {CROP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <ChevronDown size={15} className="ds-select-chevron" />
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="ds-tips">
                            <div className="ds-tips-head"><Info size={13} /> Tips for best results</div>
                            <ul>
                                <li>Use a clear, close-up shot of the affected leaf</li>
                                <li>Shoot in daylight — avoid shadows or blur</li>
                                <li>Fill the frame mostly with the leaf</li>
                                <li>Set a crop hint for higher accuracy</li>
                            </ul>
                        </div>

                        {/* Analyze button */}
                        <button
                            type="button" className="ds-btn-analyze"
                            onClick={handleAnalyze} disabled={!selectedFile || loading}
                        >
                            {loading
                                ? <><Loader size={19} className="ds-spin" /> Analyzing leaf…</>
                                : <><Microscope size={19} /> Detect Disease</>}
                        </button>

                        {result && (
                            <button type="button" className="ds-btn-reset" onClick={handleReset}>
                                <RotateCcw size={15} /> Start Over
                            </button>
                        )}
                    </div>

                    {/* ── Right: Results panel ── */}
                    <div className="ds-panel ds-results">
                        {/* Empty */}
                        {!result && !loading && !error && (
                            <div className="ds-state">
                                <div className="ds-state-icon"><FlaskConical size={46} /></div>
                                <p className="ds-state-title">No analysis yet</p>
                                <p className="ds-state-sub">Upload a leaf image and click <strong>Detect Disease</strong></p>
                            </div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <div className="ds-state">
                                <div className="ds-loading-ring" />
                                <p className="ds-state-title" style={{ color: '#86efac' }}>Running AI analysis…</p>
                                <p className="ds-state-sub">First request may take ~2 min (cold start on Render)</p>
                            </div>
                        )}

                        {/* Error */}
                        {error && !loading && (
                            <div className="ds-state ds-state-error">
                                <AlertTriangle size={36} />
                                <p className="ds-state-title">Analysis Failed</p>
                                <p className="ds-state-sub">{error}</p>
                            </div>
                        )}

                        {/* Result */}
                        {result && !loading && (
                            <div className="ds-result">
                                {/* Main card */}
                                <div className={`ds-result-card ${result.low_confidence ? 'ds-uncertain' : isHealthy ? 'ds-healthy' : 'ds-disease'}`}>
                                    <div className="ds-result-icon">
                                        {result.low_confidence ? <AlertTriangle size={26} /> : isHealthy ? <CheckCircle2 size={26} /> : <ShieldAlert size={26} />}
                                    </div>
                                    <div className="ds-result-body">
                                        <div className="ds-result-label">
                                            {result.low_confidence ? 'Uncertain Detection' : isHealthy ? 'Plant is Healthy!' : 'Disease Detected'}
                                        </div>
                                        <div className="ds-result-class">{result.predicted_class}</div>
                                        {result.crop_hint && <div className="ds-result-hint">Hint: {result.crop_hint}</div>}
                                    </div>
                                    {/* Confidence ring */}
                                    <div className="ds-ring">
                                        <svg viewBox="0 0 48 48" width="62" height="62">
                                            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                                            <circle
                                                cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.9)"
                                                strokeWidth="4"
                                                strokeDasharray={`${(result.confidence / 100) * 125.6} 125.6`}
                                                strokeLinecap="round" transform="rotate(-90 24 24)"
                                            />
                                        </svg>
                                        <span className="ds-ring-text">{result.confidence}%</span>
                                    </div>
                                </div>

                                {/* Message */}
                                {result.message && (
                                    <p className="ds-message"><Info size={13} /> {result.message}</p>
                                )}

                                {/* Top predictions */}
                                {result.top_predictions?.length > 0 && (
                                    <div className="ds-section">
                                        <div className="ds-section-title">Top Predictions</div>
                                        {result.top_predictions.map((p, i) => {
                                            const label = typeof p === 'object' ? p.class : p[0];
                                            const conf = typeof p === 'object' ? p.confidence : p[1];
                                            return (
                                                <div key={i} className="ds-pred-row">
                                                    <span className="ds-pred-rank">#{i + 1}</span>
                                                    <span className="ds-pred-label">{label}</span>
                                                    <div className="ds-pred-bar-bg">
                                                        <div className="ds-pred-bar" style={{ width: `${Math.min(conf, 100)}%`, background: confColor(conf) }} />
                                                    </div>
                                                    <span className="ds-pred-conf" style={{ color: confColor(conf) }}>{conf}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Cure */}
                                {result.cure && (
                                    <div className="ds-cure">
                                        <div className="ds-section-title">
                                            <FlaskConical size={14} />
                                            {isHealthy ? 'Care Recommendations' : 'Treatment & Cure'}
                                        </div>
                                        <p className="ds-cure-text">{result.cure}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
