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

    try {
      status.innerText = '⏳ Téléchargement sécurisé...';
      status.className = 'upload-status loading';
      const url = await uploadToCatbox(file);
      status.innerText = '✅ Prêt ! Fichier hébergé.';
      status.className = 'upload-status success';
      e.target.dataset.uploadedUrl = url;
    } catch (err) {
      status.innerText = '❌ Erreur : ' + err.message;
      status.className = 'upload-status error';
      console.error(err);
    }
  });

  document.getElementById('input-bg-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('bg-upload-status');

    try {
      status.innerText = '⏳ Téléchargement sécurisé...';
      status.className = 'upload-status loading';
      const url = await uploadToCatbox(file);
      status.innerText = '✅ Prêt ! Fichier hébergé.';
      status.className = 'upload-status success';
      e.target.dataset.uploadedUrl = url;
    } catch (err) {
      status.innerText = '❌ Erreur : ' + err.message;
      status.className = 'upload-status error';
      console.error(err);
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

    // Show warning if local files are used
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

async function uploadToCatbox(file) {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', file);

  // Note: Catbox has CORS limits. We use a proxy to ensure it works from any domain.
  // Try CodeTabs proxy which generally supports POST
  const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
  const targetUrl = 'https://catbox.moe/user/api.php';

  // We don't need encodeURIComponent for codetabs target usually, but let's be safe
  const response = await fetch(proxyUrl + targetUrl, {
    method: 'POST',
    body: formData
  });

  if (response.ok) {
    return await response.text();
  } else {
    throw new Error('Le serveur d\'hébergement est indisponible.');
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
  let mediaEl;
  if (bgType === 'video') {
    mediaEl = document.createElement('video');
    mediaEl.src = bg;
    mediaEl.loop = true;
    mediaEl.muted = false; // Will need user interaction to play with sound
    mediaEl.playsInline = true;
    // Video autoplay policy usually requires mute. We'll try to play on scratch.
  } else {
    mediaEl = document.createElement('img');
    mediaEl.src = bg;
  }
  viewerBgContainer.appendChild(mediaEl);

  // 3. Setup Scratch Canvas
  const img = new Image();
  img.crossOrigin = 'Anonymous'; // Important for external images
  img.src = cover;

  img.onload = () => {
    initCanvas(img, mediaEl);
  };
  // If image fails loading (e.g. CORS), maybe fallback?
  img.onerror = () => {
    console.error("Failed to load cover image");
    // Draw distinct fallback
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    initCanvas(null, mediaEl); // Pass null to skip drawImage re-call but init events
  };
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
