import React from 'react';
import { Trash2, Download, CheckCircle2, AlertCircle, Film, Music, FileText, Database } from 'lucide-react';
import { getFileUrl } from '../api';

export default function HistoryPanel({ history, onDeleteItem }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <p className="font-body-md text-body-md">No downloads yet. Your media extractions will appear here.</p>
      </div>
    );
  }

  const renderStatus = (item) => {
    if (item.status === 'completed') {
      return (
        <span className="bg-primary-fixed/50 text-on-primary-fixed-variant px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
          <CheckCircle2 size={14} /> Completed
        </span>
      );
    }
    if (item.status === 'failed') {
      return (
        <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
          <AlertCircle size={14} /> Failed
        </span>
      );
    }
    return (
      <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full font-label-sm text-label-sm">
        {item.status}
      </span>
    );
  };

  const renderIcon = (type) => {
    if (type === 'audio') return <Music className="text-primary opacity-80" size={24} />;
    if (type === 'video') return <Film className="text-primary opacity-80" size={24} />;
    return <FileText className="text-primary opacity-80" size={24} />;
  };

  return (
    <div className="space-y-stack-sm">
      {history.map((item) => (
        <div 
          key={item._id} 
          className="sleek-card bg-surface-container-lowest p-stack-md rounded-xl flex items-center gap-4 group hover:bg-surface-container-low transition-all border border-outline-variant/30"
        >
          <div className="w-20 h-16 bg-surface-container-highest rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
             {item.thumbnail ? (
               <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
             ) : (
               renderIcon(item.type)
             )}
          </div>
          
          <div className="flex-grow min-w-0">
            <h4 className="font-label-md text-label-md text-on-surface truncate group-hover:text-primary transition-colors" title={item.title}>
              {item.title}
            </h4>
            <div className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
              {item.fileSizeMB > 0 && <span>{item.fileSizeMB} MB • </span>}
              <span className="uppercase">{item.format || item.type || 'file'}</span>
              <span>• {item.resolutionOrBitrate || 'Best'}</span>
            </div>
            {item.errorMessage && (
              <p className="font-label-sm text-label-sm text-error mt-1 truncate" title={item.errorMessage}>
                {item.errorMessage}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {renderStatus(item)}
            
            <div className="flex items-center ml-2">
              {item.status === 'completed' && item.filename && (
                <a
                  href={getFileUrl(item.filename)}
                  download
                  className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-primary"
                  title="Download again"
                >
                  <Download size={20} />
                </a>
              )}
              <button 
                onClick={() => onDeleteItem(item._id)}
                className="p-2 hover:bg-error-container rounded-lg transition-colors text-on-surface-variant hover:text-error"
                title="Delete record"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
