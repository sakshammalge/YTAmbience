# YTAmbience

A browser extension that gives YouTube a soft, blurred **ambient glow** around the
video when you're not in fullscreen. The colours come from the video itself and
change with each scene.

## How it works

1. A content script finds the YouTube player's `<video>` element.
2. Up to 30 times a second it draws the current frame into a tiny 64 px canvas.
   Each new frame is blended over the last one, so colour changes fade instead
   of flickering on hard cuts.
3. That canvas is stretched past the player's edges, blurred and colour-boosted
   with CSS, and masked so it fades out.
4. It sits at `z-index: -1` under `<body>`, so it paints *behind* all of
   YouTube's UI. YouTube's full-page background wrappers are made transparent
   while the glow is showing so it can show through.

The glow switches off automatically in fullscreen, in the miniplayer and on
pages that aren't watch pages. Because the canvas is tiny, it costs very little
CPU or GPU time.

## Install (unpacked)

**Chrome / Edge / Brave**
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this folder.

**Firefox (121+)**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and choose `manifest.json`.

Then open any YouTube video.

## Settings

Click the toolbar icon to change these settings:

| Setting | What it does |
| --- | --- |
| Intensity | How strong the glow is (its opacity) |
| Blur | How soft the glow is |
| Spread | How far the glow reaches past the player |
| Saturation | How much the colours are boosted |
| Smoothness | How slowly colours fade between scenes |
| Refresh rate | Highest number of glow updates per second (lower uses less CPU) |
| Hide YouTube's built-in Ambient mode | Stops YouTube's own glow from stacking with this one |

## Project layout

```
manifest.json        MV3 manifest
src/defaults.js      shared default settings
src/content.js       finds the video, samples frames, positions the glow
src/content.css      glow styling + making YouTube's background transparent
popup/               settings popup
icons/               toolbar icons
```
