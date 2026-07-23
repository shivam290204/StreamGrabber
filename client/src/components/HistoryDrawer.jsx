import React from 'react';
import { X, Trash2, Download, HardDrive, Clock, ExternalLink } from 'lucide-react';
import { getFileUrl } from '../api';

export default function HistoryDrawer({ isOpen, onClose, history, onDeleteItem }) {
  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-completed">Completed</span>;
      case 'failed':
        return <span className="badge badge-failed">Failed</span>;
      case 'expired':
        return <span className="badge badge-expired">Expired</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className={`history-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <span>Download History</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              ({history.length})
            </span>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close drawer">
            <X size={20} />
          </button>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>No downloads yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Your past video extractions will appear here.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item._id} className="history-item">
                <div className="history-item-top">
                  <div className="history-item-title" title={item.title}>
                    {item.title}
                  </div>
                  {renderBadge(item.status)}
                </div>

                {item.errorMessage && (
                  <div style={{ fontSize: '0.8rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                    {item.errorMessage}
                  </div>
                )}

                <div className="history-item-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span>{item.sourceSite || 'Web'}</span>
                    {item.fileSizeMB > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        • <HardDrive size={12} /> {item.fileSizeMB} MB
                      </span>
                    )}
                    <span>• {formatDate(item.createdAt)}</span>
                  </div>

                  <div className="history-actions">
                    {item.status === 'completed' && item.filename && (
                      <a
                        href={getFileUrl(item.filename)}
                        download
                        className="btn-icon"
                        title="Download file again"
                        style={{ textDecoration: 'none', color: '#34d399' }}
                      >
                        <Download size={16} />
                      </a>
                    )}
                    
                    <button
                      className="btn-icon"
                      onClick={() => onDeleteItem(item._id)}
                      title="Delete record & file"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
