import React, { useState } from 'react';
import { Download, Link2, Clipboard, X } from 'lucide-react';

export default function DownloaderForm({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter or paste a video URL.');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setValidationError('URL must start with http:// or https://');
        return;
      }
    } catch (err) {
      setValidationError('Please enter a valid web URL format.');
      return;
    }

    onSubmit(trimmed);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setValidationError('');
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleClear = () => {
    setUrl('');
    setValidationError('');
  };

  return (
    <div className="glass-panel form-card">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="url-input-wrapper">
            <Link2 className="url-input-icon" size={20} />
            <input
              type="text"
              className="url-input"
              placeholder="Paste video URL..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={isLoading}
            />
            {url ? (
              <button
                type="button"
                className="clear-btn"
                onClick={handleClear}
                title="Clear input"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="clear-btn"
                onClick={handlePaste}
                title="Paste from clipboard"
                style={{ right: '0.8rem' }}
              >
                <Clipboard size={18} />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !url.trim()}
          >
            <Download size={20} />
            <span>{isLoading ? 'Processing...' : 'Download File'}</span>
          </button>
        </div>

        {validationError && (
          <div style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.6rem', textAlign: 'left', fontWeight: 500 }}>
            ⚠️ {validationError}
          </div>
        )}
      </form>
    </div>
  );
}
