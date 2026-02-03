import './style.css';

// Default Assets
const DEFAULTS = {
  cover: '/scratch_cover.png',
  bg: '/demo_background.png', // Ensure these are in /public
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
    const input = document.getElementById('input-cover-url');
    if (dataset.cover === 'custom') {
      input.classList.remove('hidden');
      input.required = true;
    } else {
      input.classList.add('hidden');
      input.required = false;
    }
  });

  setupToggle('.options button[data-bg]', (dataset, btn) => {
    const input = document.getElementById('input-bg-url');
    if (dataset.bg !== 'default') {
      input.classList.remove('hidden');
      input.required = true;
      input.placeholder = dataset.bg === 'custom-video' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg';
    } else {
      input.classList.add('hidden');
      input.required = false;
    }
  });

  // Generate Link
  document.getElementById('creator-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const link = generateLink();
    const resultArea = document.getElementById('result-area');
    const shareInput = document.getElementById('share-link');
    const openBtn = document.getElementById('open-link-btn');
    
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
    // Add back button for preview
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
        location.reload(); // Simple reload to clear state or we could toggle views
    });
    viewerApp.appendChild(backBtn);
  });
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
  const coverType = document.querySelector('.options button[data-cover].active').dataset.cover;
  const coverUrl = coverType === 'custom' ? document.getElementById('input-cover-url').value : DEFAULTS.cover;

  // Background
  const bgBtn = document.querySelector('.options button[data-bg].active');
  const bgType = bgBtn.dataset.bg === 'custom-video' ? 'video' : 'image';
  const bgUrl = bgBtn.dataset.bg === 'default' ? DEFAULTS.bg : document.getElementById('input-bg-url').value;

  return { msg, cover: coverUrl, bg: bgUrl, bgType };
}

function generateLink() {
  const config = getFormValues();
  const params = new URLSearchParams();
  params.set('msg', config.msg);
  if (config.cover !== DEFAULTS.cover) params.set('cover', config.cover);
  if (config.bg !== DEFAULTS.bg) params.set('bg', config.bg);
  if (config.bgType !== 'image') params.set('bgType', config.bgType);
  
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
        ctx.fillRect(0,0, canvas.width, canvas.height);
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
    if(hint) hint.classList.add('fade-out');
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
