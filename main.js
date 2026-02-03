import './style.css';

// Default Assets
const BASE_URL = import.meta.env.BASE_URL || '/';
const DEFAULTS = {
  cover: `${BASE_URL}scratch_cover.png`,
  bg: `${BASE_URL}demo_background.png`, // Ensure these are in /public
  msg: 'Joyeux Saint-Valentin ! ❤️',
  bgType: 'image'
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

  // Settings Panel
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const apiKeyInput = document.getElementById('api-key');

  // Load API Key
  apiKeyInput.value = localStorage.getItem('imgbb_api_key') || '';
  apiKeyInput.addEventListener('input', (e) => {
    localStorage.setItem('imgbb_api_key', e.target.value);
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Input Toggles
  setupToggle('.options button[data-cover]', (dataset, btn) => {
    const urlInput = document.getElementById('input-cover-url');
    const fileContainer = document.getElementById('cover-file-container');

    urlInput.classList.add('hidden');
    fileContainer.classList.add('hidden');
    urlInput.required = false;

    if (dataset.cover === 'custom') {
      urlInput.classList.remove('hidden');
      urlInput.required = true;
    } else if (dataset.cover === 'file') {
      fileContainer.classList.remove('hidden');
    }
  });

  setupToggle('.options button[data-bg]', (dataset, btn) => {
    const urlInput = document.getElementById('input-bg-url');
    const fileContainer = document.getElementById('bg-file-container');

    urlInput.classList.add('hidden');
    fileContainer.classList.add('hidden');
    urlInput.required = false;

    if (dataset.bg !== 'default' && dataset.bg !== 'file') {
      urlInput.classList.remove('hidden');
      urlInput.required = true;
      urlInput.placeholder = dataset.bg === 'custom-video' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg';
    } else if (dataset.bg === 'file') {
      fileContainer.classList.remove('hidden');
    }
  });

  // Auto-Upload logic
  document.getElementById('input-cover-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('cover-upload-status');
    const apiKey = localStorage.getItem('imgbb_api_key');

    if (!apiKey) {
      status.innerHTML = '❌ Erreur: <span style="cursor:pointer;text-decoration:underline" onclick="document.getElementById(\'settings-panel\').classList.remove(\'hidden\')">Donnez une clé API</span>';
      status.className = 'upload-status error';
      return;
    }

    try {
      status.innerText = '⏳ Téléchargement vers ImgBB...';
      status.className = 'upload-status loading';
      const url = await uploadToImgBB(file, apiKey);
      status.innerText = '✅ Prêt ! Fichier hébergé.';
      status.className = 'upload-status success';
      // Store for getFormValues
      e.target.dataset.uploadedUrl = url;
    } catch (err) {
      status.innerText = '❌ Erreur lors de l\'envoi : ' + err.message;
      status.className = 'upload-status error';
    }
  });

  document.getElementById('input-bg-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('bg-upload-status');
    const apiKey = localStorage.getItem('imgbb_api_key');

    if (file.type.startsWith('video')) {
      status.innerText = 'ℹ️ Vidéo : ImgBB ne supporte que les images. La vidéo sera lue localement.';
      status.className = 'upload-status hint';
      return;
    }

    if (!apiKey) {
      status.innerHTML = '❌ Erreur: <span style="cursor:pointer;text-decoration:underline" onclick="document.getElementById(\'settings-panel\').classList.remove(\'hidden\')">Donnez une clé API</span>';
      status.className = 'upload-status error';
      return;
    }

    try {
      status.innerText = '⏳ Téléchargement vers ImgBB...';
      status.className = 'upload-status loading';
      const url = await uploadToImgBB(file, apiKey);
      status.innerText = '✅ Prêt ! Fichier hébergé.';
      status.className = 'upload-status success';
      e.target.dataset.uploadedUrl = url;
    } catch (err) {
      status.innerText = '❌ Erreur : ' + err.message;
      status.className = 'upload-status error';
    }
  });

  // Generate Link
  document.getElementById('creator-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const config = getFormValues();
    const link = generateLink(config);
    const resultArea = document.getElementById('result-area');
    const shareInput = document.getElementById('share-link');
    const openBtn = document.getElementById('open-link-btn');
    const warning = document.getElementById('share-warning');

    if (config.coverIsFile || config.bgIsFile) {
      warning.classList.remove('hidden');
    } else {
      warning.classList.add('hidden');
    }

    shareInput.value = link;
    openBtn.href = link;
    resultArea.classList.remove('hidden');
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
      // Stop video if playing
      const video = viewerBgContainer.querySelector('video');
      if (video) video.pause();
    });
    viewerApp.appendChild(backBtn);
  });
}

async function uploadToImgBB(file, apiKey) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (data.status === 200) {
    return data.data.url;
  } else {
    throw new Error(data.error?.message || 'Inconnu');
  }
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
  let coverIsFile = false;

  if (coverType === 'custom') {
    coverUrl = document.getElementById('input-cover-url').value;
  } else if (coverType === 'file') {
    const fileInput = document.getElementById('input-cover-file');
    // Priority to uploaded URL if exists
    if (fileInput.dataset.uploadedUrl) {
      coverUrl = fileInput.dataset.uploadedUrl;
    } else if (fileInput.files[0]) {
      coverUrl = URL.createObjectURL(fileInput.files[0]);
      coverIsFile = true;
    }
  }

  // Background
  const bgBtn = document.querySelector('.options button[data-bg].active');
  let bgType = bgBtn.dataset.bg === 'custom-video' ? 'video' : 'image';
  let bgUrl = DEFAULTS.bg;
  let bgIsFile = false;

  if (bgBtn.dataset.bg === 'file') {
    const fileInput = document.getElementById('input-bg-file');
    if (fileInput.dataset.uploadedUrl) {
      bgUrl = fileInput.dataset.uploadedUrl;
      bgType = 'image';
    } else if (fileInput.files[0]) {
      bgUrl = URL.createObjectURL(fileInput.files[0]);
      bgIsFile = true;
      bgType = fileInput.files[0].type.startsWith('video') ? 'video' : 'image';
    }
  } else if (bgBtn.dataset.bg !== 'default') {
    bgUrl = document.getElementById('input-bg-url').value;
  }

  return { msg, cover: coverUrl, bg: bgUrl, bgType, coverIsFile, bgIsFile };
}

function generateLink(config) {
  const params = new URLSearchParams();
  params.set('msg', config.msg);

  // Only add if not default AND not a local file
  if (!config.coverIsFile && config.cover !== DEFAULTS.cover) {
    params.set('cover', config.cover);
  }
  if (!config.bgIsFile && config.bg !== DEFAULTS.bg) {
    params.set('bg', config.bg);
    if (config.bgType !== 'image') params.set('bgType', config.bgType);
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
  const bgType = config.bgType || 'image';

  // 1. Setup Text
  viewerText.innerText = msg;

  // 2. Setup Background
  viewerBgContainer.innerHTML = '';
  // Convert Drive Link if needed
  const normalizeUrl = (url) => {
    if (!url) return '';
    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([-_\w]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    return url;
  };

  const finalBg = normalizeUrl(bg);
  const finalCover = normalizeUrl(cover);

  let mediaEl;
  if (bgType === 'video') {
    mediaEl = document.createElement('video');
    mediaEl.src = finalBg;
    mediaEl.loop = true;
    mediaEl.muted = false; // Will need user interaction to play with sound
    mediaEl.playsInline = true;
    // Video autoplay policy usually requires mute. We'll try to play on scratch.
  } else {
    // Check if it's a video file pretending to be an image (from drive?) -> No easy way to know, assume image
    mediaEl = document.createElement('img');
    mediaEl.src = finalBg;
  }
  viewerBgContainer.appendChild(mediaEl);

  // 3. Setup Scratch Canvas
  const loadCover = (url, useCors = true) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      initCanvas(img, mediaEl);
    };

    img.onerror = () => {
      if (useCors) {
        console.warn("CORS load failed, retrying without CORS (Tainted mode)...");
        loadCover(url, false);
      } else {
        console.error("Failed to load cover image completely");
        // Draw distinct fallback
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Still init canvas so user can play (reveal background) even if cover failed
        initCanvas(null, mediaEl);
      }
    };
  };

  loadCover(finalCover, true);
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
  let videoStarted = false;
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

    // Start video/audio on first scratch interaction
    if (!videoStarted && mediaEl.tagName === 'VIDEO') {
      mediaEl.play().catch(err => console.log("Video play locked", err));
      videoStarted = true;
    }

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
