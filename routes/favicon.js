const express = require('express');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Cache directory for favicons
const FAVICON_CACHE_DIR = path.join(__dirname, '../data/favicon-cache');
const USER_FAVICON_DIR = path.join(__dirname, '../data/user-favicons');

// Ensure cache directories exist
if (!fs.existsSync(FAVICON_CACHE_DIR)) {
  fs.mkdirSync(FAVICON_CACHE_DIR, { recursive: true });
}

if (!fs.existsSync(USER_FAVICON_DIR)) {
  fs.mkdirSync(USER_FAVICON_DIR, { recursive: true });
}

/**
 * Check if a hostname is a local/private IP address or hostname
 */
function isLocalIP(hostname) {
  // Remove port if present
  const host = hostname.split(':')[0];

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.endsWith('.local') ||
    // Hostname without dots (like "ts-453be", "nas", "router")
    !host.includes('.') ||
    // Common development ports typically indicate local services
    (hostname.includes(':') && /:(3000|5000|5173|8000|8080|8443|9000)$/.test(hostname))
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

/**
 * Get image dimensions from a URL
 */
function getImageDimensions(imageUrl) {
  try {
    // Download to temp file and check dimensions
    const tempFile = path.join(USER_FAVICON_DIR, `temp_${Date.now()}.tmp`);
    execSync(`curl -L -s -m 5 -A "Mozilla/5.0" -o "${tempFile}" "${imageUrl}"`, {
      stdio: 'pipe'
    });

    // Check if file exists and has content
    if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
      return { width: null, height: null };
    }

    // Use sips (macOS) to get dimensions
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${tempFile}" 2>/dev/null`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });

    // Clean up temp file
    fs.unlinkSync(tempFile);

    // Parse output (format: "pixelWidth: 180\n  pixelHeight: 180")
    const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = output.match(/pixelHeight:\s*(\d+)/);

    if (widthMatch && heightMatch) {
      return {
        width: parseInt(widthMatch[1]),
        height: parseInt(heightMatch[1])
      };
    }
  } catch (err) {
    // Couldn't get dimensions, clean up if file exists
    const tempFile = path.join(USER_FAVICON_DIR, `temp_${Date.now()}.tmp`);
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  return { width: null, height: null };
}

/**
 * Find ALL available favicons for a domain
 */
async function findAllFavicons(domain, isLocal) {
  const protocol = isLocal ? 'http' : 'https';
  const foundFavicons = [];

  // Try common paths
  const commonPaths = [
    { path: '/favicon.svg', type: 'svg', name: 'SVG Favicon' },
    { path: '/favicon.png', type: 'png', name: 'PNG Favicon' },
    { path: '/apple-touch-icon.png', type: 'apple-touch-icon', name: 'Apple Touch Icon' },
    { path: '/apple-touch-icon-180x180.png', type: 'apple-touch-icon-180', name: 'Apple Touch Icon 180x180' },
    { path: '/apple-touch-icon-152x152.png', type: 'apple-touch-icon-152', name: 'Apple Touch Icon 152x152' },
    { path: '/apple-touch-icon-120x120.png', type: 'apple-touch-icon-120', name: 'Apple Touch Icon 120x120' },
    { path: '/apple-touch-icon-precomposed.png', type: 'apple-touch-precomposed', name: 'Apple Touch Icon (Precomposed)' },
    { path: '/favicon.ico', type: 'ico', name: 'ICO Favicon' },
  ];

  for (const { path, type, name } of commonPaths) {
    const faviconUrl = `${protocol}://${domain}${path}`;
    try {
      const output = execSync(`curl -I -L -s -m 3 -A "Mozilla/5.0" -H "Accept: image/svg+xml,image/png,image/x-icon,image/*,*/*" "${faviconUrl}"`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      if (/HTTP\/[12](?:\.\d)?\s+200/i.test(output)) {
        // Extract content-length if available
        const sizeMatch = output.match(/content-length:\s*(\d+)/i);
        const size = sizeMatch ? parseInt(sizeMatch[1]) : null;

        // Extract content-type
        const typeMatch = output.match(/content-type:\s*([^\r\n]+)/i);
        const mimeType = typeMatch ? typeMatch[1].trim() : null;

        // Get image dimensions
        const { width, height } = getImageDimensions(faviconUrl);

        foundFavicons.push({
          url: faviconUrl,
          type,
          name,
          size,
          mimeType,
          width,
          height
        });
      }
    } catch (err) {
      // Continue to next path
    }
  }

  // Try HTML parsing for additional icons
  try {
    const htmlUrl = `${protocol}://${domain}/`;
    const html = execSync(`curl -L -s -m 5 -A "Mozilla/5.0" "${htmlUrl}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024
    });

    const patterns = [
      { regex: /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi, type: 'icon' },
      { regex: /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["'][^>]*>/gi, type: 'icon' },
      { regex: /<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi, type: 'shortcut-icon' },
      { regex: /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']shortcut icon["'][^>]*>/gi, type: 'shortcut-icon' },
      { regex: /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi, type: 'apple-touch-icon-html' },
      { regex: /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["'][^>]*>/gi, type: 'apple-touch-icon-html' },
    ];

    for (const { regex, type } of patterns) {
      const matches = html.matchAll(regex);
      for (const match of matches) {
        if (match && match[1]) {
          let iconUrl = match[1];
          if (!iconUrl.startsWith('http')) {
            try {
              iconUrl = new URL(iconUrl, htmlUrl).href;
            } catch (e) {
              continue;
            }
          }

          // Check if already found from common paths
          if (foundFavicons.some(f => f.url === iconUrl)) {
            continue;
          }

          // Verify it's accessible
          try {
            const output = execSync(`curl -I -L -s -m 3 -A "Mozilla/5.0" -H "Accept: image/svg+xml,image/png,image/x-icon,image/*,*/*" "${iconUrl}"`, {
              stdio: 'pipe',
              encoding: 'utf-8'
            });

            if (/HTTP\/[12](?:\.\d)?\s+200/i.test(output)) {
              const sizeMatch = output.match(/content-length:\s*(\d+)/i);
              const size = sizeMatch ? parseInt(sizeMatch[1]) : null;

              const typeMatch = output.match(/content-type:\s*([^\r\n]+)/i);
              const mimeType = typeMatch ? typeMatch[1].trim() : null;

              // Get image dimensions
              const { width, height } = getImageDimensions(iconUrl);

              foundFavicons.push({
                url: iconUrl,
                type,
                name: type === 'icon' ? 'Icon (from HTML)' :
                      type === 'shortcut-icon' ? 'Shortcut Icon (from HTML)' :
                      'Apple Touch Icon (from HTML)',
                size,
                mimeType,
                width,
                height
              });
            }
          } catch (err) {
            // Skip this icon
          }
        }
      }
    }
  } catch (htmlErr) {
    // HTML parsing failed, that's okay
  }

  return foundFavicons;
}

/**
 * GET /api/favicon/all?url=<url>
 * Returns all available favicons for a given URL
 */
router.get('/all', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  const domain = extractDomain(url);
  if (!domain) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const isLocal = isLocalIP(domain);
    const favicons = await findAllFavicons(domain, isLocal);

    return res.json({
      domain,
      isLocal,
      favicons
    });
  } catch (err) {
    console.error(`[Favicon] Error finding all favicons for ${domain}:`, err.message);
    return res.status(500).json({ error: 'Failed to find favicons' });
  }
});

/**
 * POST /api/favicon/save
 * Downloads and permanently stores a user-selected favicon
 * Body: { faviconUrl: string }
 * Returns: { path: string } - the local path to serve the favicon
 */
router.post('/save', async (req, res) => {
  const { faviconUrl } = req.body;

  if (!faviconUrl) {
    return res.status(400).json({ error: 'faviconUrl parameter required' });
  }

  try {
    // Create a unique filename based on the URL hash
    const hash = crypto.createHash('md5').update(faviconUrl).digest('hex');
    const tempFile = path.join(USER_FAVICON_DIR, `${hash}.tmp`);

    // Download the favicon
    execSync(`curl -L -s -m 10 -A "Mozilla/5.0" -H "Accept: image/svg+xml,image/png,image/x-icon,image/*,*/*" -o "${tempFile}" "${faviconUrl}"`, {
      stdio: 'pipe'
    });

    // Verify it was downloaded and get MIME type
    if (!fs.existsSync(tempFile)) {
      return res.status(500).json({ error: 'Failed to download favicon' });
    }

    const stats = fs.statSync(tempFile);
    if (stats.size === 0) {
      fs.unlinkSync(tempFile);
      return res.status(500).json({ error: 'Downloaded file is empty' });
    }

    // Detect MIME type
    const fileTypeOutput = execSync(`file -b --mime-type "${tempFile}"`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    }).trim();

    if (!fileTypeOutput.startsWith('image/')) {
      fs.unlinkSync(tempFile);
      return res.status(500).json({ error: 'Downloaded file is not an image' });
    }

    // Determine extension from MIME type
    const mimeToExt = {
      'image/svg+xml': 'svg',
      'image/png': 'png',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };

    const ext = mimeToExt[fileTypeOutput] || 'png';
    const finalFile = path.join(USER_FAVICON_DIR, `${hash}.${ext}`);

    // Rename temp file to final filename
    fs.renameSync(tempFile, finalFile);

    // Return the path relative to /api/favicon/serve/
    return res.json({
      path: `/api/favicon/serve/${hash}.${ext}`
    });
  } catch (err) {
    console.error(`[Favicon] Error saving favicon:`, err.message);
    return res.status(500).json({ error: 'Failed to save favicon' });
  }
});

/**
 * GET /api/favicon/serve/:filename
 * Serves a user-selected favicon from permanent storage
 */
router.get('/serve/:filename', (req, res) => {
  const { filename } = req.params;

  // Sanitize filename to prevent directory traversal
  const sanitized = path.basename(filename);
  const filePath = path.join(USER_FAVICON_DIR, sanitized);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Favicon not found' });
  }

  return res.sendFile(filePath);
});

module.exports = router;
