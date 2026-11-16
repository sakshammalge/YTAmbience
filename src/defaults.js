// Shared default settings for the content script and the popup.
// eslint-disable-next-line no-unused-vars
const YTA_DEFAULTS = Object.freeze({
  enabled: true,
  intensity: 0.85, // opacity of the glow, 0..1
  blur: 70, // px of blur applied to the glow
  spread: 0.22, // how far the glow reaches past each player edge, as a fraction of player size
  saturation: 1.5, // colour boost
  smoothness: 0.75, // 0 = instant colour changes, close to 1 = slow, cinematic fades
  fps: 30, // max glow refresh rate
  hideNative: true, // hide YouTube's own "Ambient mode" so the two don't stack
});
