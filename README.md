# Facebook Video Speed Controller v3.0

A modern, high-performance Chrome extension that turns Facebook video playback into a power suite: speed controls (0.25x – 4.0x), audio booster up to 300%, floating Picture-in-Picture, high-resolution frame screenshot capture, quick seek jumps, and smart format profiles for Feed, Watch, Reels, and Fullscreen.

---

## What's New in v3.0

- 🔊 **Audio Volume Booster (Up to 300%)**: Amplify low-volume speech and quiet phone recordings using Web Audio API (`GainNode`). Cycle or slide through 100%, 150%, 200%, and 300%.
- 📺 **Native Picture-in-Picture (PiP)**: Pop out any Facebook video with a single click on the overlay to keep watching while multitasking across browser tabs.
- 📷 **High-Resolution Frame Screenshot**: Dedicated camera button captures and saves the exact video frame at native video resolution as a PNG.
- ⏩ **Quick Seek Jumpers (±5s)**: Effortlessly skip forward or rewind 5 seconds without fiddling with Facebook's tiny progress bar.
- 🎯 **Smart Format Profiles**: Automatically keeps Reels at normal `1.0x` speed while speeding up standard Feed/Watch videos, with live broadcast freeze protection.
- 🎛️ **Custom Presets Editor**: Customize and save your own list of preset speeds directly from the popup dashboard.
- ⚡ **Expanded Speed Range & Stepping**: Control playback from **0.25x to 4.0x** with granular `−0.1x` / `+0.1x` stepper buttons.
- 💊 **Compact Pill UI Mode**: Clean floating pill (`⚡ 1.5x`) that expands into full controls on hover or click, preserving full screen real estate.
- 👻 **Smart Auto-Hide**: Fades out overlay controls after 2 seconds of mouse inactivity so video content, subtitles, and captions are never obstructed.
- 🚀 **Observer Engine**: Powered by `IntersectionObserver`, `ResizeObserver`, and `requestAnimationFrame` debouncing for zero lag and minimal battery consumption.

---

## Installation (Unpacked)

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select this repository folder:
   `C:\Users\aajli\OneDrive\Desktop\some project with AI\Fb-video-speed`
5. Visit [facebook.com](https://www.facebook.com) to enjoy the power suite!

---

## Features & Controls

### On-Video Overlay
- **Pill Mode**: Shows the current speed badge (`⚡ 1.5x`). Hover or tap to expand the control tray.
- **Fine Adjustment**: Click `−` or `+` to change speed by `0.1x`.
- **Presets**: Instant jump to any of your configured speed presets.
- **Seek Buttons**: Instant `−5s` rewind and `+5s` forward.
- **PiP Button**: Click `📺` to enter floating Picture-in-Picture mode.
- **Screenshot Button**: Click `📷` to download a crystal-clear frame capture.
- **Audio Boost Button**: Click `🔊` to cycle volume amplification (100% → 150% → 200% → 300%).
- **Auto-Hide**: Fades out smoothly when idle; wakes up on mouse movement.

### Popup Dashboard (Extension Icon)
- **Master Toggle**: Enable or disable the extension with one click without uninstalling.
- **Speed Slider & Display**: Smooth slider from `0.25x` to `4.0x` with 0.05x granularity.
- **Custom Presets Manager**: Edit and save custom speed presets (e.g. `0.75, 1, 1.25, 1.5, 2, 2.5`).
- **Audio Boost Slider**: Amplify volume between 100% and 300%.
- **Smart Profiles**: Toggle "Keep Reels at 1.0x (Normal)".
- **Tool Visibility**: Toggle Seek buttons, PiP button, and Screenshot button on/off.
- **Overlay Style & Position**: Choose between Compact Pill or Full Bar, toggle auto-hide, and dock to Top-Right, Top-Left, Bottom-Right, or Bottom-Left.

---

## Privacy & Permissions
- **No analytics or data collection**: Operates 100% locally in your browser.
- **Permissions**: Only `storage` is requested to save your preferences.
