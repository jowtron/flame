const express = require('express');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Cache directory for favicons
const FAVICON_CACHE_DIR = path.join(__dirname, '../data/favicon-cache');

// Ensure cache directory exists
if (!fs.existsSync(FAVICON_CACHE_DIR)) {
  fs.mkdirSync(FAVICON_CACHE_DIR, { recursive: true });
}

/**
 * Check if a hostname is a local/private IP address
 */
function isLocalIP(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  );
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname + (urlObj.port && urlObj.port !== '80' && urlObj.port !== '443' ? ':' + urlObj.port : '');
  } catch (err) {
    return null;
  }
}

/**
 * Try to fetch favicon from common locations
 */
async function tryFetchFavicon(domain, isLocal) {
  const protocol = isLocal ? 'http' : 'https';
  // Try formats in priority order: SVG (best quality) > PNG > ICO
  const commonPaths = [
    '/favicon.svg',
    '/favicon.png',
    '/apple-touch-icon.png',
    '/apple-touch-icon-180x180.png',
    '/apple-touch-icon-152x152.png',
    '/apple-touch-icon-precomposed.png',
    '/favicon.ico',
  ];

  for (const faviconPath of commonPaths) {
    const faviconUrl = `${protocol}://${domain}${faviconPath}`;
    try {
      // Use curl to check if URL returns 200 OK
      // Include Accept header for SVG to avoid 406 responses
      const output = execSync(`curl -I -L -s -m 3 -A "Mozilla/5.0" -H "Accept: image/svg+xml,image/png,image/x-icon,image/*,*/*" "${faviconUrl}"`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      // Check if response contains HTTP 200 status
      if (/HTTP\/[12](?:\.\d)?\s+200/i.test(output)) {
        return faviconUrl;
      }
    } catch (err) {
      // Continue to next path
    }
  }

  // If common paths fail, try parsing HTML for icon metadata
  try {
    const htmlUrl = `${protocol}://${domain}/`;
    const html = execSync(`curl -L -s -m 5 -A "Mozilla/5.0" "${htmlUrl}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 // 1MB max
    });

    // Look for favicon in link tags - prioritize by type
    const patterns = [
      { regex: /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi, priority: 1 },
      { regex: /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["'][^>]*>/gi, priority: 1 },
      { regex: /<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi, priority: 2 },
      { regex: /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']shortcut icon["'][^>]*>/gi, priority: 2 },
      { regex: /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi, priority: 3 },
      { regex: /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["'][^>]*>/gi, priority: 3 },
    ];

    const foundIcons = [];
    for (const { regex, priority } of patterns) {
      const matches = html.matchAll(regex);
      for (const match of matches) {
        if (match && match[1]) {
          let iconUrl = match[1];
          // Resolve relative URLs
          if (!iconUrl.startsWith('http')) {
            try {
              iconUrl = new URL(iconUrl, htmlUrl).href;
            } catch (e) {
              continue;
            }
          }
          foundIcons.push({ url: iconUrl, priority });
        }
      }
    }

    // Sort by priority and return first valid icon
    foundIcons.sort((a, b) => a.priority - b.priority);
    for (const { url } of foundIcons) {
      try {
        // Verify the icon URL is accessible
        const output = execSync(`curl -I -L -s -m 3 -A "Mozilla/5.0" -H "Accept: image/svg+xml,image/png,image/x-icon,image/*,*/*" "${url}"`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        if (/HTTP\/[12](?:\.\d)?\s+200/i.test(output)) {
          return url;
        }
      } catch (err) {
        // Continue to next icon
      }
    }
  } catch (htmlErr) {
    // HTML parsing failed, continue to fallback
  }

  // Fallback
  return `${protocol}://${domain}/favicon.ico`;
}

/**
 * Download favicon using curl and return the MIME type
 */
function downloadFavicon(faviconUrl, outputPath) {
  try {
    execSync(`curl -L -s -m 10 -A "Mozilla/5.0" -H "Accept: image/svg+xml,image/png,image/x-icon,image/*,*/*" -o "${outputPath}" "${faviconUrl}"`, {
      stdio: 'pipe'
    });

    // Check if file was created and has content
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        // Validate that it's actually an image file, not HTML/text
        try {
          const fileTypeOutput = execSync(`file -b --mime-type "${outputPath}"`, {
            stdio: 'pipe',
            encoding: 'utf-8'
          }).trim();

          // Check if it's an image MIME type
          if (fileTypeOutput.startsWith('image/')) {
            return fileTypeOutput; // Return MIME type instead of true
          }
        } catch (err) {
          // file command failed, clean up and return false
        }
      }
      fs.unlinkSync(outputPath);
    }
    return false;
  } catch (err) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    return false;
  }
}

/**
 * Map MIME type to file extension
 */
function mimeToExtension(mimeType) {
  const mimeMap = {
    'image/svg+xml': 'svg',
    'image/png': 'png',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  return mimeMap[mimeType] || 'ico';
}

/**
 * GET /api/favicon?url=<url>
 * Fetches and caches favicon for the given URL
 */
router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  const domain = extractDomain(url);
  if (!domain) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Create cache filename from domain hash (extension will be added after download)
  const hash = crypto.createHash('md5').update(domain).digest('hex');
  const cacheFileBase = path.join(FAVICON_CACHE_DIR, hash);

  // Check cache first - look for any extension
  const possibleExtensions = ['svg', 'png', 'ico', 'jpg', 'webp'];
  for (const ext of possibleExtensions) {
    const cacheFile = `${cacheFileBase}.${ext}`;
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      // Serve from cache if less than 7 days old
      const age = Date.now() - stats.mtimeMs;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (age < maxAge) {
        return res.sendFile(cacheFile);
      }
      // Cache expired, delete it
      fs.unlinkSync(cacheFile);
    }
  }

  // Try to fetch favicon
  try {
    const isLocal = isLocalIP(domain);
    const faviconUrl = await tryFetchFavicon(domain, isLocal);

    // Download to temp file first
    const tempFile = `${cacheFileBase}.tmp`;
    const mimeType = downloadFavicon(faviconUrl, tempFile);

    if (mimeType) {
      // Rename to correct extension based on MIME type
      const ext = mimeToExtension(mimeType);
      const cacheFile = `${cacheFileBase}.${ext}`;
      fs.renameSync(tempFile, cacheFile);
      return res.sendFile(cacheFile);
    }

    // If direct fetch failed, try Google's service (but only for public IPs)
    if (!isLocal) {
      const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      const googleMimeType = downloadFavicon(googleUrl, tempFile);

      if (googleMimeType) {
        const ext = mimeToExtension(googleMimeType);
        const cacheFile = `${cacheFileBase}.${ext}`;
        fs.renameSync(tempFile, cacheFile);
        return res.sendFile(cacheFile);
      }
    }

    // All methods failed
    return res.status(404).json({ error: 'Favicon not found' });
  } catch (err) {
    console.error(`[Favicon] Error fetching favicon for ${domain}:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch favicon' });
  }
});

module.exports = router;
