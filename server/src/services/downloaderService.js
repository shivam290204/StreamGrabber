const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Require ffmpeg-static binary path for stream merging if available
let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  console.warn('[Downloader Warning] ffmpeg-static package not found.');
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
 * Executes a promise with a max timeout
 */
const withTimeout = (promise, ms = 5000) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

/**
 * Checks if a URL points directly to an HTML or non-video document file
 */
const isWebDocumentUrl = (urlStr) => {
  const lower = urlStr.toLowerCase();
  return lower.includes('.html') || lower.includes('.htm') || lower.includes('.xhtml');
};

/**
 * Extracts metadata for a media/web URL using yt-dlp with timeout
 */
const getVideoInfo = async (url) => {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided. Please enter a valid http/https URL.');
  }

  const urlObj = new URL(url);
  const pathnameParts = urlObj.pathname.split('/').filter(Boolean);
  const rawFilename = pathnameParts.length > 0 ? pathnameParts[pathnameParts.length - 1] : 'webpage';
  let fallbackExt = 'html';
  if (rawFilename.includes('.')) {
    fallbackExt = rawFilename.split('.').pop().toLowerCase();
  }

  // Fast path for HTML document URLs - bypass yt-dlp media extraction entirely
  if (isWebDocumentUrl(url)) {
    return {
      title: rawFilename.replace(/[^\w\s.-]/gi, '').trim() || 'webpage',
      extractor: urlObj.hostname,
      duration: 0,
      thumbnail: null,
      ext: fallbackExt
    };
  }

  const flags = {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    noPlaylist: true,
    socketTimeout: 6,
    retries: 1
  };

  if (ffmpegPath) {
    flags.ffmpegLocation = ffmpegPath;
  }

  try {
    // Attempt yt-dlp info extraction with 5s max timeout
    const info = await withTimeout(youtubedl(url, flags), 5000);
    return {
      title: info.title || info.fulltitle || rawFilename || 'Downloaded Resource',
      extractor: info.extractor_key || info.extractor || urlObj.hostname,
      duration: info.duration || 0,
      thumbnail: info.thumbnail || null,
      ext: info.ext || fallbackExt
    };
  } catch (err) {
    // Fallback metadata if yt-dlp times out or doesn't support the URL format
    return {
      title: rawFilename.replace(/[^\w\s.-]/gi, '').trim() || 'webpage',
      extractor: urlObj.hostname,
      duration: 0,
      thumbnail: null,
      ext: fallbackExt
    };
  }
};

/**
 * Direct HTTP/HTTPS file downloader fallback for generic files (HTML, ZIP, images, raw media, etc.)
 */
const downloadDirectFile = async (url, targetFilePath) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const reqOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    };

    const request = client.get(url, reqOptions, (response) => {
      // Follow HTTP 301 / 302 / 307 / 308 redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (redirectUrl.startsWith('/')) {
          const original = new URL(url);
          redirectUrl = `${original.origin}${redirectUrl}`;
        }
        return downloadDirectFile(redirectUrl, targetFilePath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP status ${response.statusCode}`));
      }

      const fileStream = fs.createWriteStream(targetFilePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(targetFilePath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(targetFilePath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(targetFilePath, () => {});
      reject(err);
    });

    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Connection timed out downloading file.'));
    });
  });
};

/**
 * Downloads media or any file type from a given URL
 */
const downloadVideo = async (url) => {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided. Please enter a valid http/https URL.');
  }

  // Step 1: Get metadata
  const info = await getVideoInfo(url);

  // Clean title for safe filesystem filename
  const sanitizedTitle = (info.title || 'download')
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 50) || 'file';

  const timestamp = Date.now();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${sanitizedTitle}_${timestamp}.%(ext)s`);

  let downloadSucceeded = false;

  // Step 2: If URL is an HTML document URL, bypass yt-dlp and download directly over HTTP
  const isHtml = isWebDocumentUrl(url);

  if (!isHtml) {
    const downloadFlags = {
      format: 'bestvideo+bestaudio/best',
      output: outputTemplate,
      noPlaylist: true,
      noWarnings: true,
      socketTimeout: 10,
      retries: 1
    };

    if (ffmpegPath) {
      downloadFlags.ffmpegLocation = ffmpegPath;
    }

    try {
      // Attempt yt-dlp extraction with 15s max timeout
      await withTimeout(youtubedl(url, downloadFlags), 15000);
      downloadSucceeded = true;
    } catch (ytErr) {
      console.warn(`[yt-dlp Warning] ${ytErr.message}`);
    }
  }

  // Step 3: Direct HTTP file fallback download for HTML documents or unsupported links
  if (!downloadSucceeded) {
    console.log('[Downloader] Fetching file directly over HTTP/HTTPS...');
    const fallbackExt = info.ext || 'html';
    const fallbackFilename = `${sanitizedTitle}_${timestamp}.${fallbackExt}`;
    const fallbackPath = path.join(DOWNLOADS_DIR, fallbackFilename);

    try {
      await downloadDirectFile(url, fallbackPath);
      downloadSucceeded = true;
    } catch (httpErr) {
      throw new Error(`Failed to download resource: ${httpErr.message}`);
    }
  }

  // Step 4: Locate downloaded file in DOWNLOADS_DIR
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const matchedFile = files.find(f => f.includes(String(timestamp)) && !f.endsWith('.part'));

  if (!matchedFile) {
    throw new Error('Download finished but file could not be located on disk.');
  }

  const finalFilePath = path.join(DOWNLOADS_DIR, matchedFile);
  const stats = fs.statSync(finalFilePath);
  const fileSizeMB = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
  const ext = matchedFile.includes('.') ? matchedFile.split('.').pop().toLowerCase() : 'file';

  return {
    info: {
      ...info,
      ext: ext
    },
    filename: matchedFile,
    filePath: finalFilePath,
    fileSizeMB,
    format: ext
  };
};

module.exports = {
  isValidUrl,
  getVideoInfo,
  downloadVideo,
  DOWNLOADS_DIR
};
