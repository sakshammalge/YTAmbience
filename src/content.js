/* global YTA_DEFAULTS */
(() => {
  'use strict';

  if (window.__ytaLoaded) return;
  window.__ytaLoaded = true;

  const SAMPLE_SIZE = 64; // long side of the tiny canvas the frame is drawn into
  const VIDEO_REQUERY_MS = 500;
  const MIN_PLAYER_WIDTH = 320; // smaller than this = miniplayer / thumbnail preview

  const root = document.documentElement;
  const hasStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

  let settings = { ...YTA_DEFAULTS };
  let glow = null;
  let canvas = null;
  let ctx = null;
  let video = null;
  let lastVideoQuery = 0;
  let lastDraw = 0;
  let lastTime = -1;
  let needsFullDraw = true;
  let visible = false;
  let lastGeometry = '';

  // ---------- settings ----------

  function applySettings() {
    if (!glow) return;
    glow.style.setProperty('--yta-intensity', String(settings.intensity));
    glow.style.setProperty('--yta-blur', `${settings.blur}px`);
    glow.style.setProperty('--yta-saturation', String(settings.saturation));
    root.classList.toggle('yta-hide-native', !!settings.hideNative);
    lastGeometry = ''; // spread may have changed
    needsFullDraw = true;
  }

  if (hasStorage) {
    chrome.storage.sync.get(YTA_DEFAULTS, (stored) => {
      settings = { ...YTA_DEFAULTS, ...stored };
      applySettings();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in YTA_DEFAULTS) settings[key] = newValue ?? YTA_DEFAULTS[key];
      }
      applySettings();
    });
  }

  // ---------- DOM ----------

  function ensureGlow() {
    if (glow && glow.isConnected) return;
    glow = document.createElement('div');
    glow.id = 'yta-glow';
    glow.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = Math.round((SAMPLE_SIZE * 9) / 16);
    ctx = canvas.getContext('2d', { alpha: false });
    glow.appendChild(canvas);
    document.body.appendChild(glow);
    applySettings();
  }

  function findVideo() {
    return (
      document.querySelector('#movie_player video.html5-main-video') ||
      document.querySelector('#movie_player video') ||
      document.querySelector('video.html5-main-video')
    );
  }

  function onVideoReset() {
    needsFullDraw = true;
  }

  function attachVideo(next) {
    if (next === video) return;
    if (video) {
      for (const ev of ['seeked', 'loadeddata', 'emptied']) video.removeEventListener(ev, onVideoReset);
    }
    video = next;
    if (video) {
      for (const ev of ['seeked', 'loadeddata', 'emptied']) video.addEventListener(ev, onVideoReset);
    }
    needsFullDraw = true;
  }

  // Remember the page colour before YouTube's wrappers go transparent; it is
  // used as a fallback if the theme variable isn't visible on <html>.
  function syncPageBackground() {
    if (visible) return;
    const app = document.querySelector('ytd-app');
    const bg = app && getComputedStyle(app).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      root.style.setProperty('--yta-page-bg', bg);
    }
  }

  // ---------- visibility ----------

  function isWatchPage() {
    return location.pathname === '/watch' || location.pathname.startsWith('/live/');
  }

  function shouldShow(rect) {
    if (!settings.enabled || !video || !isWatchPage()) return false;
    if (document.fullscreenElement || document.webkitFullscreenElement) return false;
    if (document.querySelector('ytd-app[miniplayer-is-active]')) return false;
    if (rect.width < MIN_PLAYER_WIDTH || rect.height < 100) return false;
    if (video.readyState < 2 || video.videoWidth === 0) return false;
    return true;
  }

  function setActive(on) {
    if (on === visible) return;
    if (on) syncPageBackground();
    visible = on;
    root.classList.toggle('yta-active', on);
    glow.classList.toggle('yta-visible', on);
    if (on) needsFullDraw = true;
  }

  // ---------- rendering ----------

  function position(rect) {
    const sx = rect.width * settings.spread;
    const sy = rect.height * settings.spread;
    const left = Math.round(rect.left + window.scrollX - sx);
    const top = Math.round(rect.top + window.scrollY - sy);
    const width = Math.round(rect.width + sx * 2);
    const height = Math.round(rect.height + sy * 2);
    const geometry = `${left},${top},${width},${height}`;
    if (geometry === lastGeometry) return;
    lastGeometry = geometry;
    glow.style.transform = `translate(${left}px, ${top}px)`;
    glow.style.width = `${width}px`;
    glow.style.height = `${height}px`;
  }

  function draw(now) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const h = Math.max(1, Math.round((SAMPLE_SIZE * vh) / vw));
    if (canvas.height !== h) {
      canvas.height = h; // resizing clears the canvas
      needsFullDraw = true;
    }

    const changed = video.currentTime !== lastTime;
    if (!changed && !needsFullDraw) return;
    if (!needsFullDraw && now - lastDraw < 1000 / settings.fps) return;

    // Blending each new frame over the previous one gives smooth colour fades
    // instead of flicker on hard cuts.
    ctx.globalAlpha = needsFullDraw ? 1 : Math.max(0.02, 1 - settings.smoothness);
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch {
      return; // frame not decodable yet
    }
    lastTime = video.currentTime;
    lastDraw = now;
    needsFullDraw = false;
  }

  function tick(now) {
    requestAnimationFrame(tick);

    if (!document.body) return;
    ensureGlow();

    if (now - lastVideoQuery > VIDEO_REQUERY_MS || (video && !video.isConnected)) {
      lastVideoQuery = now;
      attachVideo(findVideo());
    }

    const rect = video ? video.getBoundingClientRect() : null;
    const show = !!rect && shouldShow(rect);
    setActive(show);
    if (!show) return;

    position(rect);
    draw(now);
  }

  // YouTube is a single-page app; re-check right away after navigation.
  window.addEventListener('yt-navigate-finish', () => {
    lastVideoQuery = 0;
    needsFullDraw = true;
  });
  document.addEventListener('yt-page-data-updated', syncPageBackground);

  requestAnimationFrame(tick);
})();
