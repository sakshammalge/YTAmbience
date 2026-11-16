/* global YTA_DEFAULTS */
'use strict';

const FORMATS = {
  percent: (v) => `${Math.round(v * 100)}%`,
  px: (v) => `${v}px`,
  x: (v) => `${Number(v).toFixed(1)}×`,
  fps: (v) => `${v} fps`,
};

const controls = document.getElementById('controls');
const inputs = [...document.querySelectorAll('input[id]')];

function render(settings) {
  for (const input of inputs) {
    const value = settings[input.id];
    if (input.type === 'checkbox') {
      input.checked = !!value;
    } else {
      input.value = value;
      showValue(input);
    }
  }
  controls.classList.toggle('off', !settings.enabled);
}

function showValue(input) {
  const out = document.querySelector(`output[for="${input.id}"]`);
  if (out) out.textContent = FORMATS[input.dataset.format](Number(input.value));
}

function save(input) {
  const value = input.type === 'checkbox' ? input.checked : Number(input.value);
  chrome.storage.sync.set({ [input.id]: value });
  if (input.id === 'enabled') controls.classList.toggle('off', !value);
}

for (const input of inputs) {
  if (input.type === 'range') {
    // Live preview while dragging; storage.sync has write quotas, so throttle.
    let pending = 0;
    input.addEventListener('input', () => {
      showValue(input);
      clearTimeout(pending);
      pending = setTimeout(() => save(input), 60);
    });
  } else {
    input.addEventListener('change', () => save(input));
  }
}

document.getElementById('reset').addEventListener('click', () => {
  chrome.storage.sync.set({ ...YTA_DEFAULTS }, () => render(YTA_DEFAULTS));
});

chrome.storage.sync.get(YTA_DEFAULTS, render);
