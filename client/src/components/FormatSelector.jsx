import React from 'react';
import { Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getFileUrl } from '../api';

export default function FormatSelector({ isDownloading, downloadResult, downloadError, onReset }) {
  if (!isDownloading && !downloadResult && !downloadError) return null;

  return (
    <div className="w-full">
      {/* 1. Downloading Card */}
      {isDownloading && (
        <div className="sleek-card bg-surface-container-lowest rounded-xl overflow-hidden p-stack-lg border border-outline-variant/30 flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="animate-spin text-primary" size={48} />
          <h3 className="font-headline-md text-headline-md text-on-surface">Processing Download</h3>
          <p className="text-on-surface-variant font-body-md">Please wait while we fetch and prepare your file...</p>
        </div>
      )}

      {/* 2. Success Download Card */}
      {downloadResult && !isDownloading && (
        <div className="sleek-card bg-surface-container-lowest rounded-xl overflow-hidden p-stack-md border border-outline-variant/30 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
           <div className="w-16 h-16 bg-primary-fixed/30 text-primary flex items-center justify-center rounded-full flex-shrink-0">
             <CheckCircle2 size={32} />
           </div>
           
           <div className="flex-grow">
             <span className="bg-primary-fixed/50 text-on-primary-fixed-variant px-3 py-1 rounded-full font-label-sm text-label-sm mb-2 inline-block">
                Ready for Download
             </span>
             <h3 className="font-headline-md text-headline-md text-on-surface mb-2 line-clamp-1" title={downloadResult.title}>{downloadResult.title}</h3>
             <p className="font-label-sm text-label-sm text-on-surface-variant">
               {(downloadResult.format || 'FILE').toUpperCase()} • {downloadResult.resolutionOrBitrate || 'Original'} {downloadResult.fileSizeMB ? `• ${downloadResult.fileSizeMB} MB` : ''}
             </p>
           </div>
           
           <div className="flex flex-col gap-2 w-full md:w-auto">
             <a
                href={getFileUrl(downloadResult.filename)}
                download
                className="h-12 px-6 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download size={20} /> Save to Disk
              </a>
              <button 
                onClick={onReset}
                className="h-10 px-6 text-primary font-label-md text-label-md hover:underline decoration-2 underline-offset-4"
              >
                Download Another
              </button>
           </div>
        </div>
      )}

      {/* 3. Error Card */}
      {downloadError && !isDownloading && (
        <div className="sleek-card bg-error-container text-on-error-container rounded-xl overflow-hidden p-stack-md flex flex-col md:flex-row items-center gap-6">
          <AlertCircle size={32} className="text-error flex-shrink-0" />
          <div className="flex-grow text-center md:text-left">
            <h4 className="font-headline-md text-headline-md mb-1">Download Failed</h4>
            <p className="font-body-md text-body-md opacity-90">{downloadError}</p>
          </div>
          <button 
            onClick={onReset} 
            className="h-12 px-6 bg-error text-on-error rounded-xl font-label-md text-label-md hover:opacity-90 transition-opacity active:scale-[0.98] whitespace-nowrap"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
