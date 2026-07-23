import React, { useState, useEffect } from 'react';
import UrlInput from './components/UrlInput';
import FormatSelector from './components/FormatSelector';
import HistoryPanel from './components/HistoryPanel';
import { fetchMediaInfo, triggerDownload, fetchHistory, deleteHistoryItem } from './api';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  
  // Step workflow states: 'idle' | 'fetching_info' | 'info_loaded' | 'downloading' | 'success' | 'error'
  const [appState, setAppState] = useState('idle');
  
  const [downloadResult, setDownloadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [history, setHistory] = useState([]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchHistory();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.warn('History fetch suppressed:', err.message);
    }
  };

  // Direct Download Action
  const handleDownloadAction = async (url) => {
    setCurrentUrl(url);
    setAppState('downloading');
    setErrorMessage('');
    setDownloadResult(null);

    try {
      const payload = { url };
      const result = await triggerDownload(payload);
      setDownloadResult(result);
      setAppState('success');
      loadHistory();
    } catch (err) {
      setErrorMessage(err.message || 'Download failed.');
      setAppState('error');
      loadHistory();
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleClearAllHistory = async () => {
    // Assuming there's an API for clear all, or we iterate (for simplicity, we'll just clear state for now if API isn't present, 
    // but a real app would call bulk delete)
    for (const item of history) {
      await deleteHistoryItem(item._id);
    }
    setHistory([]);
  };

  const handleReset = () => {
    setAppState('idle');
    setCurrentUrl('');
    setDownloadResult(null);
    setErrorMessage('');
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      {/* Top Navigation Shell */}
      <header className="fixed top-0 left-0 w-full h-16 z-50 bg-surface flex items-center justify-between px-margin-mobile md:px-gutter shadow-sm border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl object-contain shadow-sm border border-outline-variant/30" />
            <h1 className="font-kaushan text-headline-lg text-primary tracking-tight">StreamGrabber</h1>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 flex flex-col items-center px-margin-mobile md:px-gutter">
        <div className="w-full max-w-[1120px] flex flex-col items-center space-y-stack-lg">
          
          {/* Hero / Fetch Section */}
          <section className="w-full max-w-3xl text-center space-y-stack-md">
            <h2 className="font-unna text-headline-xl text-primary mb-stack-sm tracking-tight italic">
              Instant Capability.
            </h2>
            <p className="text-on-surface-variant font-unna italic text-body-lg max-w-xl mx-auto">
              Download your favorite media from across the web in high fidelity with just a single link.
            </p>
            
            <UrlInput
              onSubmit={handleDownloadAction}
              isLoading={appState === 'downloading'}
            />
          </section>

          {/* Media Details Card (Active Result) */}
          {(appState === 'downloading' || downloadResult || appState === 'error') && (
            <section className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <FormatSelector
                isDownloading={appState === 'downloading'}
                downloadResult={downloadResult}
                downloadError={appState === 'error' ? errorMessage : ''}
                onReset={handleReset}
              />
            </section>
          )}

          {/* Download History Panel */}
          {history.length > 0 && (
            <section className="w-full max-w-3xl space-y-stack-md mt-12">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-headline-md text-on-surface">Download History</h2>
                <button 
                  onClick={handleClearAllHistory}
                  className="text-primary font-label-md text-label-md hover:underline decoration-2 underline-offset-4"
                >
                  Clear All
                </button>
              </div>
              
              <HistoryPanel
                history={history}
                onDeleteItem={handleDeleteHistory}
              />
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
