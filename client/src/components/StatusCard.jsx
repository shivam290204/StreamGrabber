import React from 'react';
import { Download, CheckCircle2, AlertCircle, HardDrive, Globe, Film } from 'lucide-react';
import { getFileUrl } from '../api';

export default function StatusCard({ status, result, error, onReset }) {
  if (status === 'idle') return null;

  return (
    <div className="glass-panel status-card">
      {status === 'loading' && (
        <div className="status-loading">
          <div className="spinner" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.3rem' }}>
              Fetching & Processing File...
            </h3>
          </div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="result-card">
          <div className="result-header">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={26} />
              </div>
              <div>
                <span className="badge badge-completed" style={{ marginBottom: '0.4rem', display: 'inline-block' }}>
                  Ready for Download
                </span>
                <h3 className="result-title">{result.title}</h3>
                <div className="result-meta">
                  <span className="meta-pill">
                    <Globe size={14} /> {result.sourceSite || 'Web'}
                  </span>
                  <span className="meta-pill">
                    <Film size={14} /> {(result.format || 'FILE').toUpperCase()} Format
                  </span>
                  {result.fileSizeMB > 0 && (
                    <span className="meta-pill">
                      <HardDrive size={14} /> {result.fileSizeMB} MB
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <a
              href={getFileUrl(result.filename)}
              download
              className="btn btn-primary"
              style={{ textDecoration: 'none', padding: '0.85rem 1.6rem' }}
            >
              <Download size={20} />
              <span>Save {(result.format || 'File').toUpperCase()} to Disk</span>
            </a>
            
            <button
              onClick={onReset}
              className="btn btn-secondary"
            >
              Download Another File
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="result-card">
          <div className="error-box">
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#fca5a5' }}>
                Download Failed
              </h4>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                {error || 'Unable to download video from the provided link.'}
              </p>
            </div>
          </div>
          <div>
            <button onClick={onReset} className="btn btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
