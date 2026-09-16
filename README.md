# Facebook Video Speed Controller v2.0

A modern, high-performance Chrome extension that adds custom video playback speed controls (0.25x – 4.0x) to every video on Facebook (Feed, Watch, Reels, and Fullscreen).

---

## What's New in v2.0

- ⚡ **Expanded Speed Range & Fine Stepping**: Control playback from **0.25x to 4.0x** with granular `−0.1x` / `+0.1x` stepper buttons.
- 💊 **Compact Pill UI Mode**: Clean floating pill (`⚡ 1.5x`) that expands into full controls on hover or click, preserving full screen real estate.
- 👻 **Smart Auto-Hide**: Fades out overlay controls after 2 seconds of mouse inactivity so video content, subtitles, and captions are never obstructed.
- 🚀 **High-Performance Observer Engine**: Replaced aggressive 150ms DOM polling and layout-thrashing reflows with `IntersectionObserver`, `ResizeObserver`, and `requestAnimationFrame` debouncing for zero lag and minimal battery consumption.
- 🎛️ **New Dashboard & Master Toggle**: Complete popup redesign with speed slider, instant presets, master ON/OFF switch, display mode selector, and position configurator.
- 🔄 **Cloud & Cross-Device Sync**: Settings persist across devices via `chrome.storage.sync` (with seamless local storage fallback).

---

## Installation (Unpacked)

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select this repository folder:
   `C:\Users\aajli\OneDrive\Desktop\some project with AI\Fb-video-speed`
5. Visit [facebook.com](https://www.facebook.com) to enjoy instant playback speed control!

---

## Features & Controls

### On-Video Overlay
- **Pill Mode**: Shows the current speed badge (`⚡ 1.5x`). Hover or tap to expand the control tray.
- **Fine Adjustment**: Click `−` or `+` to change speed by `0.1x`.
- **Presets**: Instant jump to `0.75x`, `1x`, `1.25x`, `1.5x`, `1.75x`, or `2x`.
- **Auto-Hide**: Move the mouse away and the overlay smoothly disappears until active again.

### Popup Dashboard (Extension Icon)
- **Master Toggle**: Enable or disable the extension with one click without uninstalling.
- **Speed Slider & Display**: Smooth slider from `0.25x` to `4.0x` with 0.05x granularity.
- **Quick Presets**: Instant selection from `0.75x` up to `3.0x`.
- **Overlay Style**: Toggle between `Compact Pill` and `Full Bar`.
- **Auto-Hide Toggle**: Toggle fading behavior.
- **Dock Position**: Choose between `Top Right`, `Top Left`, `Bottom Right`, or `Bottom Left`.

---

## Privacy & Permissions
- **No analytics or data collection**: Operates 100% locally in your browser.
- **Permissions**: Only `storage` is requested to save your preferences.
