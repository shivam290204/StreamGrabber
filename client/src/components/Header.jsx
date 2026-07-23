import React from 'react';
import { Zap, History } from 'lucide-react';

export default function Header({ historyCount, onOpenHistory }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-icon">
          <Zap size={24} />
        </div>
        <div>
          <div className="brand-title">StreamGrabber</div>
          <div className="brand-subtitle">Personal Video Downloader</div>
        </div>
      </div>

      <button 
        className="btn btn-secondary" 
        onClick={onOpenHistory}
        title="View Download History"
      >
        <History size={18} />
        <span>History</span>
        {historyCount > 0 && (
          <span style={{
            background: 'var(--accent-primary)',
            color: '#ffffff',
            borderRadius: '9999px',
            padding: '0.1rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginLeft: '0.2rem'
          }}>
            {historyCount}
          </span>
        )}
      </button>
    </header>
  );
}
