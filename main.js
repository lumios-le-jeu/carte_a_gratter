import './style.css';

// Default Assets
const BASE_URL = import.meta.env.BASE_URL || '/';
const DEFAULTS = {
  cover: `${BASE_URL}scratch_cover.png`,
  bg: `${BASE_URL}demo_background.png`, // Ensure these are in /public
  msg: 'Joyeux Saint-Valentin ! ❤️',
};

// State
let isPreview = false;

// DOM Elements
const creatorApp = document.getElementById('creator-app');
const viewerApp = document.getElementById('viewer-app');
const viewerBgContainer = document.getElementById('background-container');
const viewerText = document.getElementById('overlay-text');
const canvas = document.getElementById('scratch-canvas');
const ctx = canvas.getContext('2d');

// --- INITIALIZATION ---
const params = new URLSearchParams(window.location.search);
if (params.has('msg') || params.has('bg')) {
  initViewer(Object.fromEntries(params));
} else {
  initCreator();
}

// --- CREATOR LOGIC ---
function initCreator() {
  creatorApp.classList.remove('hidden');
  viewerApp.classList.add('hidden');

  // Input Toggles
  setupToggle('.options button[data-cover]', (dataset, btn) => {
    const urlInput = document.getElementById('input-cover-url');
    const urlHint = document.getElementById('cover-url-hint');

    urlInput.classList.add('hidden');
    urlHint.classList.add('hidden');
    urlInput.required = false;

    if (dataset.cover === 'custom') {
      urlInput.classList.remove('hidden');
      urlHint.classList.remove('hidden');
      urlInput.required = true;
    }
  });

  setupToggle('.options button[data-bg]', (dataset, btn) => {
    const urlInput = document.getElementById('input-bg-url');
    const urlHint = document.getElementById('bg-url-hint');

    urlInput.classList.add('hidden');
    urlHint.classList.add('hidden');
    urlInput.required = false;

    if (dataset.bg !== 'default') {
      urlInput.classList.remove('hidden');
      urlHint.classList.remove('hidden');
      urlInput.required = true;
      urlInput.placeholder = 'https://drive.google.com/file/d/... (image)';
    }
  });

  // Generate Link
  document.getElementById('creator-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = getFormValues();
    const longLink = generateLink(config);

    const resultArea = document.getElementById('result-area');
    const shareInput = document.getElementById('share-link');
    const openBtn = document.getElementById('open-link-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Show long link immediately
    shareInput.value = longLink;
    openBtn.href = longLink;
    resultArea.classList.remove('hidden');

    // Scroll to results
    resultArea.scrollIntoView({ behavior: 'smooth' });

    // Try to shorten the link
    if (!longLink.includes('localhost') && !longLink.includes('127.0.0.1')) {
      const originalText = copyBtn.innerText;
      copyBtn.innerText = '...';
      copyBtn.style.opacity = '0.5';

      const shortLink = await shortenURL(longLink);
      if (shortLink !== longLink) {
        shareInput.value = shortLink;
        openBtn.href = shortLink;
      }

      copyBtn.innerText = originalText;
      copyBtn.style.opacity = '1';
    }
  });

  // Copy Button
  document.getElementById('copy-btn').addEventListener('click', () => {
    const shareInput = document.getElementById('share-link');
    shareInput.select();
    navigator.clipboard.writeText(shareInput.value);
    const btn = document.getElementById('copy-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Copié !';
    setTimeout(() => btn.innerText = originalText, 2000);
  });

  // Preview Button
  document.getElementById('preview-btn').addEventListener('click', () => {
    const config = getFormValues();
    isPreview = true;
    initViewer(config);

    const backBtn = document.createElement('button');
    backBtn.innerText = '✏️ Retourner à l\'édition';
    backBtn.style.position = 'absolute';
    backBtn.style.top = '20px';
    backBtn.style.left = '20px';
    backBtn.style.zIndex = '100';
    backBtn.style.padding = '10px 20px';
    backBtn.style.background = 'white';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '30px';
    backBtn.style.cursor = 'pointer';
    backBtn.id = 'preview-back-btn';

    backBtn.addEventListener('click', () => {
      viewerApp.classList.add('hidden');
      creatorApp.classList.remove('hidden');
      backBtn.remove();
    });
    viewerApp.appendChild(backBtn);
  });
}

async function shortenURL(url) {
  try {
    // Use corsproxy.io to bypass CORS - more reliable than allorigins
    const proxyUrl = 'https://corsproxy.io/?';
    const targetUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
    if (response.ok) {
      const shortUrl = await response.text();
      if (shortUrl.startsWith('https://is.gd/')) {
        return shortUrl;
      }
    }
  } catch (err) {
    console.warn('URL shortening failed:', err);
  }
  return url;
}



function setupToggle(selector, callback) {
  const btns = document.querySelectorAll(selector);
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset, btn);
    });
  });
}

function getFormValues() {
  const msg = document.getElementById('input-message').value || DEFAULTS.msg;

  // Cover
  const coverBtn = document.querySelector('.options button[data-cover].active');
  const coverType = coverBtn.dataset.cover;
  let coverUrl = DEFAULTS.cover;

  if (coverType === 'custom') {
    coverUrl = document.getElementById('input-cover-url').value;
  }

  // Background
  const bgBtn = document.querySelector('.options button[data-bg].active');
  let bgUrl = DEFAULTS.bg;

  if (bgBtn.dataset.bg !== 'default') {
    bgUrl = document.getElementById('input-bg-url').value;
  }

  return { msg, cover: coverUrl, bg: bgUrl };
}

function generateLink(config) {
  const params = new URLSearchParams();
  params.set('msg', config.msg);

  // Only add if not default
  if (config.cover !== DEFAULTS.cover) {
    params.set('cover', config.cover);
  }
  if (config.bg !== DEFAULTS.bg) {
    params.set('bg', config.bg);
  }

  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// --- VIEWER LOGIC ---
function initViewer(config) {
  creatorApp.classList.add('hidden');
  viewerApp.classList.remove('hidden');

  // Normalize defaults
  const msg = config.msg || DEFAULTS.msg;
  const cover = config.cover || DEFAULTS.cover;
  const bg = config.bg || DEFAULTS.bg;

  // 1. Setup Text
  viewerText.innerText = msg;

  // 2. Setup Background
  viewerBgContainer.innerHTML = '';

  // Convert Drive Link if needed - try multiple formats
  const normalizeUrl = (url) => {
    if (!url) return '';

    // Google Drive - extract ID
    const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-_\w]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      // Try thumbnail API which is more CORS-friendly for images
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w4000`;
    }

    return url;
  };

  // Proxy wrapper for stubborn URLs (like Drive)
  const maybeProxy = (url) => {
    // If it's a Drive URL, use a CORS proxy
    if (url.includes('drive.google.com')) {
      // Use allorigins which is more reliable for Drive
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const finalBg = normalizeUrl(bg);
  const finalCover = normalizeUrl(cover);

  const mediaEl = document.createElement('img');
  // Use proxy immediately for Drive to avoid console noise
  const bgToLoad = finalBg.includes('drive.google.com') ? maybeProxy(finalBg) : finalBg;
  mediaEl.src = bgToLoad;

  mediaEl.onerror = () => {
    if (!mediaEl.src.includes('allorigins') && finalBg.includes('drive.google.com')) {
      console.warn("Retry background with proxy...");
      mediaEl.src = maybeProxy(finalBg);
    }
  };
  viewerBgContainer.appendChild(mediaEl);

  // 3. Setup Scratch Canvas
  const loadingIndicator = document.getElementById('loading-indicator');

  const loadCover = (url, useProxy = false, useCors = true) => {
    loadingIndicator.classList.remove('hidden');

    const img = new Image();
    if (useCors) img.crossOrigin = 'Anonymous';

    // If it's Drive, use proxy by default on first try to avoid CORS console errors
    const shouldProxy = useProxy || (url.includes('drive.google.com') && !useProxy);
    const targetUrl = shouldProxy ? maybeProxy(url) : url;

    img.src = targetUrl;

    img.onload = () => {
      loadingIndicator.classList.add('hidden');
      initCanvas(img, mediaEl);
    };

    img.onerror = () => {
      if (!shouldProxy && url.includes('drive.google.com')) {
        loadCover(url, true, useCors);
      } else if (useCors) {
        loadCover(url, shouldProxy, false);
      } else {
        loadingIndicator.classList.add('hidden');
        initCanvas(null, mediaEl);
      }
    };
  };

  loadCover(finalCover, false, true);
}

function initCanvas(coverImg, mediaEl) {
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (coverImg) {
      // Draw image covering the canvas (cover fit)
      const aspect = coverImg.width / coverImg.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawW, drawH, startX, startY;

      if (aspect > canvasAspect) {
        drawH = canvas.height;
        drawW = drawH * aspect;
        startX = (canvas.width - drawW) / 2;
        startY = 0;
      } else {
        drawW = canvas.width;
        drawH = drawW / aspect;
        startX = 0;
        startY = (canvas.height - drawH) / 2;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(coverImg, startX, startY, drawW, drawH);
    } else {
      // Fallback fill
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#d4af37'; // Gold
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Prepare for scratching
    ctx.globalCompositeOperation = 'destination-out';
  };

  window.addEventListener('resize', resize);
  resize();

  // Scratch Logic
  let isDrawing = false;
  const SCRATCH_RADIUS = 35;

  const getPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const scratch = (e) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.arc(x, y, SCRATCH_RADIUS, 0, 2 * Math.PI);
    ctx.fill();

    // Hide hint
    const hint = document.querySelector('.scratch-hint');
    if (hint) hint.classList.add('fade-out');
  };

  const startScratch = (e) => {
    isDrawing = true;
    scratch(e);
  };

  const endScratch = () => {
    isDrawing = false;
  };

  canvas.addEventListener('mousedown', startScratch);
  canvas.addEventListener('mousemove', scratch);
  canvas.addEventListener('mouseup', endScratch);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scroll
    startScratch(e);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    scratch(e);
  }, { passive: false });

  canvas.addEventListener('touchend', endScratch);
}
