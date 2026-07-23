const http = require('http');
const https = require('https');
const fs = require('fs');

// Puppeteer for bypassing Cloudflare/Bot-protection
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Analyzes a URL using HTTP GET to determine content type and size
 * @param {string} url - The URL to analyze
 * @returns {Promise<Object>} - The analysis result
 */
const analyzeUrl = (urlStr) => {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlStr);
    } catch (e) {
      return resolve({ isValid: false, isDirectFile: false });
    }

    const client = url.protocol === 'https:' ? https : http;
    const reqOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    const request = client.request(url, reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${url.origin}${redirectUrl}`;
        }
        return resolve(analyzeUrl(redirectUrl));
      }

      if (res.statusCode >= 400) {
        return resolve({ isValid: true, isDirectFile: false, error: `HTTP ${res.statusCode}` });
      }

      const contentType = (res.headers['content-type'] || '').toLowerCase();
      const contentLength = res.headers['content-length'];
      let fileSizeApprox = null;
      if (contentLength) {
        fileSizeApprox = `${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2)} MB`;
      }

      const isHtml = contentType.includes('text/html');
      const isDirectFile = !isHtml && contentType !== '';

      let fileType = 'document';
      let ext = 'file';

      if (contentType.includes('image/')) {
        fileType = 'image';
        ext = contentType.split('/')[1].split(';')[0].split('+')[0].replace('jpeg', 'jpg');
      } else if (contentType.includes('application/pdf')) {
        fileType = 'document';
        ext = 'pdf';
      } else if (contentType.includes('application/zip')) {
        fileType = 'document';
        ext = 'zip';
      } else if (contentType.includes('audio/') || contentType.includes('video/')) {
        fileType = contentType.includes('audio/') ? 'audio' : 'video';
        ext = contentType.split('/')[1].split(';')[0];
      } else if (isDirectFile) {
        const pathnameParts = url.pathname.split('/').filter(Boolean);
        if (pathnameParts.length > 0) {
          const lastPart = pathnameParts[pathnameParts.length - 1];
          if (lastPart.includes('.')) {
            ext = lastPart.split('.').pop().toLowerCase();
          }
        }
      }

      resolve({
        isValid: true,
        isDirectFile,
        contentType,
        fileType,
        ext,
        fileSizeApprox,
        finalUrl: urlStr
      });
      request.destroy();
    });

    request.on('error', () => {
      resolve({ isValid: true, isDirectFile: false, error: 'Network Error' });
    });

    request.setTimeout(5000, () => {
      request.destroy();
      resolve({ isValid: true, isDirectFile: false, error: 'Timeout' });
    });

    request.end();
  });
};

/**
 * Fallback to Puppeteer to bypass Cloudflare and Bot protection challenges
 * @param {string} urlStr - Target URL
 * @param {string} targetPath - Path to save file
 */
const downloadWithPuppeteer = async (urlStr, targetPath) => {
  let browser;
  console.log(`[Puppeteer] Launching stealth browser to bypass bot protection for ${urlStr}...`);
  try {
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    const page = await browser.newPage();
    
    // Wait until network is idle (vital for Cloudflare JS challenges)
    const response = await page.goto(urlStr, { waitUntil: 'networkidle2', timeout: 45000 });
    
    if (!response) {
      throw new Error('Failed to get response from Puppeteer browser.');
    }

    const contentType = (response.headers()['content-type'] || '').toLowerCase();
    
    if (contentType.includes('text/html')) {
      // Save HTML content directly
      const htmlContent = await page.content();
      fs.writeFileSync(targetPath, htmlContent, 'utf8');
      console.log(`[Puppeteer] Saved HTML content to ${targetPath}`);
    } else {
      // Buffer the direct file (image, pdf, etc.)
      const buffer = await response.buffer();
      fs.writeFileSync(targetPath, buffer);
      console.log(`[Puppeteer] Saved binary file to ${targetPath}`);
    }
    
    await browser.close();
    return targetPath;
  } catch (err) {
    if (browser) await browser.close();
    throw new Error(`Puppeteer bypass failed: ${err.message}`);
  }
};

/**
 * Downloads a direct file stream
 * @param {string} urlStr - The direct URL
 * @param {string} targetPath - The absolute destination file path
 */
const downloadDirectFile = (urlStr, targetPath) => {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlStr);
    } catch (e) {
      return reject(new Error('Invalid URL'));
    }

    const client = url.protocol === 'https:' ? https : http;
    const reqOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    const request = client.get(urlStr, reqOptions, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${url.origin}${redirectUrl}`;
        }
        return downloadDirectFile(redirectUrl, targetPath).then(resolve).catch(reject);
      }

      // If we hit Cloudflare / anti-bot block (403 Forbidden or 503 Service Unavailable)
      if (response.statusCode === 403 || response.statusCode === 503) {
        console.warn(`[Downloader] Encountered HTTP ${response.statusCode} (Bot Protection). Falling back to Puppeteer Stealth...`);
        return downloadWithPuppeteer(urlStr, targetPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP status ${response.statusCode}`));
      }

      const fileStream = fs.createWriteStream(targetPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(targetPath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(targetPath, () => {});
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Connection timed out downloading file.'));
    });
  });
};

module.exports = {
  analyzeUrl,
  downloadDirectFile,
  downloadWithPuppeteer
};
