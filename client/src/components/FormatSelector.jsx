import React, { useState } from 'react';
import { Film, Music, Download, CheckCircle2, AlertCircle, Database, Eye, Loader2, PlayCircle, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { getFileUrl } from '../api';

export default function FormatSelector({ mediaInfo, onDownload, isDownloading, downloadResult, downloadError, onReset }) {
  const [downloadType, setDownloadType] = useState('video');
  const [selectedFormatId, setSelectedFormatId] = useState('best');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('mp3');
  const [selectedAudioQuality, setSelectedAudioQuality] = useState('0');

  if (!mediaInfo && !downloadResult && !downloadError) return null;

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTriggerDownload = () => {
    if (mediaInfo.isDirectFile) {
      onDownload({ type: 'file' });
    } else {
      if (downloadType === 'video') {
        onDownload({ type: 'video', formatId: selectedFormatId });
      } else {
        onDownload({ type: 'audio', audioFormat: selectedAudioFormat, audioQuality: selectedAudioQuality });
      }
    }
  };

  return (
    <div className="w-full">
      {/* 1. Preview Card & Format Options */}
      {mediaInfo && !downloadResult && (
        <div className="sleek-card bg-surface-container-lowest rounded-xl overflow-hidden p-stack-md md:p-gutter flex flex-col md:flex-row gap-gutter border border-outline-variant/30">
          
          {/* Thumbnail */}
          <div className="relative w-full md:w-72 aspect-video flex-shrink-0 bg-surface-container rounded-lg overflow-hidden border border-outline-variant/20 flex items-center justify-center">
            {mediaInfo.thumbnail && !mediaInfo.isDirectFile ? (
              <img
                src={mediaInfo.thumbnail}
                alt={mediaInfo.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">
                {mediaInfo.fileType === 'image' ? <ImageIcon size={48} /> : <Database size={48} />}
              </div>
            )}
            
            {mediaInfo.duration > 0 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white font-label-sm text-label-sm rounded-md backdrop-blur-md">
                {formatDuration(mediaInfo.duration)}
              </div>
            )}
            {mediaInfo.isDirectFile && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-primary text-white font-label-sm text-label-sm rounded-md uppercase">
                {mediaInfo.ext}
              </div>
            )}
          </div>

          {/* Details & Controls */}
          <div className="flex-grow flex flex-col justify-between py-1">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-headline-md text-headline-md text-on-surface line-clamp-2 pr-4" title={mediaInfo.title}>
                  {mediaInfo.title}
                </h3>
                {!mediaInfo.isDirectFile && (
                  <span className="bg-primary-fixed text-on-primary-fixed-variant px-2 py-1 rounded-md font-label-sm text-label-sm whitespace-nowrap">
                    {mediaInfo.sourceSite || 'Web'}
                  </span>
                )}
              </div>
              
              <div className="flex gap-4 mt-2 text-on-surface-variant font-label-sm text-label-sm">
                {mediaInfo.fileSizeApprox && (
                  <span className="flex items-center gap-1">
                    <Database size={16} /> ~{mediaInfo.fileSizeApprox}
                  </span>
                )}
                {/* Fallback metrics for design fidelity if needed */}
              </div>
            </div>

            {/* Config Options */}
            {!mediaInfo.isDirectFile ? (
              <div className="mt-stack-md flex flex-col gap-4">
                
                {/* Custom download type toggle replacing standard select for visual flair */}
                <div className="flex gap-2 p-1 bg-surface-container-low rounded-lg w-fit">
                  <button 
                    onClick={() => setDownloadType('video')} 
                    disabled={isDownloading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-sm text-label-sm transition-all ${downloadType === 'video' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <Film size={16} /> Video
                  </button>
                  <button 
                    onClick={() => setDownloadType('audio')} 
                    disabled={isDownloading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-sm text-label-sm transition-all ${downloadType === 'audio' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <Music size={16} /> Audio
                  </button>
                </div>

                {downloadType === 'video' ? (
                  <div className="grid grid-cols-1 gap-stack-md">
                    <div className="space-y-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">Video Quality</label>
                      <select 
                        value={selectedFormatId}
                        onChange={(e) => setSelectedFormatId(e.target.value)}
                        disabled={isDownloading}
                        className="w-full bg-surface-container-low border-none rounded-lg font-label-md text-label-md py-2 px-3 focus:ring-2 focus:ring-primary-container outline-none appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {(mediaInfo.videoFormats || []).map((f) => (
                          <option key={f.formatId} value={f.formatId}>
                            {f.resolution} {f.filesizeApprox ? `(~${f.filesizeApprox})` : ''} {f.note ? `- ${f.note}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-stack-md">
                    <div className="space-y-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">Audio Format</label>
                      <select 
                        value={selectedAudioFormat}
                        onChange={(e) => setSelectedAudioFormat(e.target.value)}
                        disabled={isDownloading}
                        className="w-full bg-surface-container-low border-none rounded-lg font-label-md text-label-md py-2 px-3 focus:ring-2 focus:ring-primary-container outline-none appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {(mediaInfo.audioFormats || []).map((af) => (
                          <option key={af.id} value={af.id}>{af.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">Quality</label>
                      <select 
                        value={selectedAudioQuality}
                        onChange={(e) => setSelectedAudioQuality(e.target.value)}
                        disabled={isDownloading}
                        className="w-full bg-surface-container-low border-none rounded-lg font-label-md text-label-md py-2 px-3 focus:ring-2 focus:ring-primary-container outline-none appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {(mediaInfo.audioBitrates || []).map((ab) => (
                          <option key={ab.id} value={ab.id}>{ab.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ) : (
               <div className="mt-stack-md bg-surface-container-low p-4 rounded-lg">
                 <p className="text-on-surface-variant text-body-md font-body-md">
                   {mediaInfo.isHtmlFallback ? 'No media found on page. You can download the raw HTML file below.' : 'Direct file detected. Ready to download.'}
                 </p>
               </div>
            )}

            <div className="flex gap-4 mt-stack-md">
              <button 
                onClick={handleTriggerDownload}
                disabled={isDownloading}
                className="flex-grow h-12 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Download Now
                  </>
                )}
              </button>
              
              <button 
                onClick={onReset}
                disabled={isDownloading}
                className="h-12 px-6 bg-surface-container-high text-on-surface rounded-xl font-label-md text-label-md hover:bg-surface-variant transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Success Download Card */}
      {downloadResult && (
        <div className="sleek-card bg-surface-container-lowest rounded-xl overflow-hidden p-stack-md border border-outline-variant/30 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
           <div className="w-16 h-16 bg-primary-fixed/30 text-primary flex items-center justify-center rounded-full flex-shrink-0">
             <CheckCircle2 size={32} />
           </div>
           
           <div className="flex-grow">
             <span className="bg-primary-fixed/50 text-on-primary-fixed-variant px-3 py-1 rounded-full font-label-sm text-label-sm mb-2 inline-block">
                Ready for Download
             </span>
             <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{downloadResult.title}</h3>
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
      {downloadError && (
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
