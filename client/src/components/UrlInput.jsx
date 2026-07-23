import React, { useState } from 'react';
import { Link2, Zap, Loader2 } from 'lucide-react';

export default function UrlInput({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 relative flex flex-col md:flex-row gap-4 w-full">
      <div className="relative flex-grow group">
        <Link2 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" 
          size={20} 
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste link here"
          disabled={isLoading}
          className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all text-body-md font-unna italic shadow-sm disabled:opacity-50"
        />
      </div>
      
      <button 
        type="submit" 
        disabled={!url.trim() || isLoading}
        className="h-14 px-8 bg-primary text-on-primary font-unna italic text-label-md rounded-xl hover:bg-primary-container active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 min-w-[160px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Fetching...
          </>
        ) : (
          <>
            <Zap size={20} />
            Fetch Info
          </>
        )}
      </button>
    </form>
  );
}
