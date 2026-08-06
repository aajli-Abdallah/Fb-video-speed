# Facebook Video Speed Controller

A Chrome extension that adds one-click speed buttons (1x, 1.2x, 1.5x, 1.7x, 2x) to every video on Facebook.

## Install (unpacked, for personal use / testing)

1. Unzip this folder (if it is ziped) somewhere permanent (don't delete it after installing — Chrome loads the extension directly from these files).
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked**.
5. Select the `fb-speed-extension` folder.
6. Go to facebook.com — a small speed panel will appear in the top-left corner of any video (feed, watch, reels).

## How it works

- **On-video buttons**: every video gets a small overlay with 1x / 1.2x / 1.5x / 1.7x / 2x buttons. Click one to change that video's speed instantly.
- **Toolbar popup**: click the extension icon to set a default speed that new videos will use automatically, and to push the speed change to videos already playing in open Facebook tabs.
- Your last-picked speed is remembered (via `chrome.storage.local`) and applied automatically the next time you open Facebook.
- A `MutationObserver` plus a periodic safety scan keep watching the page so newly loaded videos (as you scroll the feed, open Reels, etc.) get the controls too.

## Notes

- This only affects facebook.com. It does not touch other sites.
- Facebook's video player is a moving target and occasionally changes its DOM structure; if buttons stop appearing after a Facebook redesign, the extension may need a small update to its selectors.
- No data is collected or sent anywhere — the only permission used is local storage for remembering your preferred speed.
