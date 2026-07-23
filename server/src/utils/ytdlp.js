const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { analyzeUrl, downloadDirectFile } = require('./analyzer');

// Require ffmpeg-static binary path for merging and audio conversion
let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  console.warn('[yt-dlp Utility Warning] ffmpeg-static package not found.');
}

const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

/**
 * Validates whether a string is a well-formed HTTP/HTTPS URL
 */
const isValidUrl = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
};

/**
 * Executes a promise with a max timeout to prevent indefinite hangs
 */
const withTimeout = (promise, ms = 12000) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

/**
 * Step 1: Fetch metadata and simplified video & audio format options from URL
 */
const fetchMediaInfo = async (url) => {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided. Please enter a valid http/https URL.');
  }

  // 1. Pre-analyze URL to determine if it's a direct file (Image, PDF, etc.)
  const analysis = await analyzeUrl(url);
  const urlObj = new URL(url);
  let rawFilename = 'file';
  const pathnameParts = urlObj.pathname.split('/').filter(Boolean);
  if (pathnameParts.length > 0) {
    rawFilename = pathnameParts[pathnameParts.length - 1];
  }

  if (analysis.isDirectFile) {
    // Return early without calling yt-dlp
    return {
      isDirectFile: true,
      fileType: analysis.fileType, // 'image', 'document', 'audio', 'video'
      ext: analysis.ext || 'file',
      title: decodeURIComponent(rawFilename),
      contentType: analysis.contentType,
      fileSizeApprox: analysis.fileSizeApprox,
      sourceSite: urlObj.hostname
    };
  }

  // 2. If it's HTML or undetermined, try yt-dlp to extract media
  const flags = {
    dumpSingleJson: true,     
    noWarnings: true,         
    noCheckCertificates: true,
    noPlaylist: true,         
    socketTimeout: 8,        
    retries: 1                
  };

  if (ffmpegPath) {
    flags.ffmpegLocation = ffmpegPath; 
  }

  let rawInfo;
  try {
    rawInfo = await withTimeout(youtubedl(url, flags), 45000); // Increased timeout to 45s
  } catch (err) {
    console.error('[yt-dlp fetchMediaInfo Error]:', err.message);
    
    if (err.message.includes('429') || urlObj.hostname.includes('youtube') || urlObj.hostname.includes('youtu.be')) {
      throw new Error(err.message.includes('429') ? 'YouTube is currently blocking requests from this server (HTTP 429 Too Many Requests). Please try again later or run the server locally.' : err.message);
    }

    // 3. Fallback: If yt-dlp fails (e.g. generic webpage), offer it as an HTML direct file download
    return {
      isDirectFile: true,
      fileType: 'document',
      ext: 'html',
      title: decodeURIComponent(rawFilename) || 'Webpage',
      contentType: 'text/html',
      fileSizeApprox: null,
      sourceSite: urlObj.hostname,
      isHtmlFallback: true
    };
  }

  // Process video formats into simplified resolution options
  const formats = rawInfo.formats || [];
  const videoFormatMap = new Map();

  videoFormatMap.set('best', {
    formatId: 'bestvideo+bestaudio/best',
    resolution: 'Best Available (Default)',
    ext: 'mp4',
    note: 'Highest combined quality'
  });

  formats.forEach((f) => {
    if (f.vcodec && f.vcodec !== 'none' && (f.height || f.resolution)) {
      const height = f.height ? `${f.height}p` : f.resolution;
      if (!videoFormatMap.has(height)) {
        let approxMB = 0;
        if (f.filesize || f.filesize_approx) {
          approxMB = parseFloat(((f.filesize || f.filesize_approx) / (1024 * 1024)).toFixed(1));
        }
        videoFormatMap.set(height, {
          formatId: f.format_id,
          resolution: height,
          ext: f.ext || 'mp4',
          filesizeApprox: approxMB > 0 ? `${approxMB} MB` : null,
          note: f.format_note || `${f.fps || 30}fps`
        });
      }
    }
  });

  const videoFormats = Array.from(videoFormatMap.values());

  const audioFormats = [
    { id: 'mp3', name: 'MP3 (Universal Audio)', ext: 'mp3' },
    { id: 'm4a', name: 'M4A / AAC (Apple Compatible)', ext: 'm4a' },
    { id: 'opus', name: 'Opus / WebM (High Compression)', ext: 'opus' }
  ];

  const audioBitrates = [
    { id: '0', label: 'Best Quality (320kbps)' },
    { id: '192K', label: '192 kbps' },
    { id: '128K', label: '128 kbps (Compact)' }
  ];

  return {
    isDirectFile: false,
    title: rawInfo.title || rawInfo.fulltitle || 'Untitled Resource',
    thumbnail: rawInfo.thumbnail || (rawInfo.thumbnails && rawInfo.thumbnails.length ? rawInfo.thumbnails[0].url : null),
    duration: rawInfo.duration || 0,
    sourceSite: rawInfo.extractor_key || rawInfo.extractor || 'Web',
    videoFormats,
    audioFormats,
    audioBitrates
  };
};

/**
 * Step 2: Download media file or direct file
 */
const downloadMedia = async ({ url, type = 'video', formatId, audioFormat = 'mp3', audioQuality = '0' }) => {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided. Please enter a valid http/https URL.');
  }

  const info = await fetchMediaInfo(url);
  
  // Clean title for safe filesystem filename
  const sanitizedTitle = (info.title || 'download')
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 50) || 'file';

  const timestamp = Date.now();
  let extTemplate = '%(ext)s';
  
  if (type === 'file') {
    extTemplate = info.ext || 'file';
  } else if (type === 'audio') {
    extTemplate = audioFormat;
  } else {
    extTemplate = '%(ext)s'; // Let yt-dlp determine the correct extension (e.g., jpg for images)
  }

  const outputTemplate = path.join(DOWNLOADS_DIR, `${sanitizedTitle}_${timestamp}.${extTemplate}`);

  let resolutionOrBitrate = 'Best';
  
  // Direct file download execution
  if (type === 'file' || info.isDirectFile) {
    try {
      await downloadDirectFile(url, outputTemplate);
    } catch (err) {
      throw new Error(`Direct download failed: ${err.message}`);
    }
    resolutionOrBitrate = 'Original';
  } else {
    // yt-dlp download execution (video/audio)
    let downloadFlags = {};
    if (type === 'audio') {
      downloadFlags = {
        extractAudio: true,
        audioFormat: audioFormat,
        audioQuality: audioQuality,
        output: outputTemplate,
        noPlaylist: true,
        noWarnings: true,
        socketTimeout: 15,
        retries: 3
      };
      resolutionOrBitrate = audioQuality === '0' ? `${audioFormat.toUpperCase()} 320kbps` : `${audioFormat.toUpperCase()} ${audioQuality}`;
    } else {
      const chosenFormat = formatId && formatId !== 'best' 
        ? `${formatId}+bestaudio/best`
        : 'bestvideo+bestaudio/best';

      downloadFlags = {
        format: chosenFormat,
        mergeOutputFormat: 'mp4',
        output: outputTemplate,
        noPlaylist: true,
        noWarnings: true,
        socketTimeout: 15,
        retries: 3
      };
      resolutionOrBitrate = formatId === 'best' || !formatId ? 'Best Available' : formatId;
    }

    if (ffmpegPath) {
      downloadFlags.ffmpegLocation = ffmpegPath;
    }

    try {
      await withTimeout(youtubedl(url, downloadFlags), 60000);
    } catch (ytErr) {
      throw new Error(`Download failed: ${ytErr.message || 'Error processing media file.'}`);
    }
  }

  // Locate the resulting file in DOWNLOADS_DIR
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const matchedFile = files.find(f => f.includes(String(timestamp)) && !f.endsWith('.part'));

  if (!matchedFile) {
    throw new Error('Download completed but output file could not be located on disk.');
  }

  const finalFilePath = path.join(DOWNLOADS_DIR, matchedFile);
  const stats = fs.statSync(finalFilePath);
  const fileSizeMB = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
  const finalExt = matchedFile.includes('.') ? matchedFile.split('.').pop().toLowerCase() : extTemplate;

  return {
    info,
    filename: matchedFile,
    filePath: finalFilePath,
    fileSizeMB,
    format: finalExt,
    resolutionOrBitrate
  };
};

module.exports = {
  isValidUrl,
  fetchMediaInfo,
  downloadMedia,
  DOWNLOADS_DIR
};
