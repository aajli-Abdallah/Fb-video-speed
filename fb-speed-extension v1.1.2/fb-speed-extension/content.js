(() => {
  const SPEEDS = [1, 1.2, 1.5, 1.7, 2];
  const STORAGE_KEY = "fbPreferredSpeed";
  let preferredSpeed = 1;

  // videoEl -> { overlay, panel, buttons: Map<speed, btnEl> }
  const tracked = new Map();

  // Load saved preference
  try {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      if (res && res[STORAGE_KEY]) {
        preferredSpeed = res[STORAGE_KEY];
        tracked.forEach((entry, video) => applySpeed(video, entry, preferredSpeed));
      }
    });
  } catch (e) {
    // storage may be unavailable in rare contexts; fall back silently
  }

  function savePreferred(speed) {
    preferredSpeed = speed;
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: speed });
    } catch (e) {}
  }

  function formatLabel(speed) {
    return speed === 1 ? "1x" : `${speed}x`;
  }

  function applySpeed(video, entry, speed) {
    video.playbackRate = speed;
    if (entry) {
      entry.buttons.forEach((btn, s) => {
        btn.classList.toggle("fb-speed-active", s === speed);
      });
      entry.currentSpeed = speed;
    }
  }

  function createOverlay(video) {
    // Full-viewport-independent overlay: a fixed-position div that we
    // continuously reposition to match the video's on-screen rect.
    // This avoids depending on Facebook's own DOM/CSS structure, which
    // differs between the feed, watch page, and the fullscreen/theater
    // player.
    const overlay = document.createElement("div");
    overlay.className = "fb-speed-overlay";

    const panel = document.createElement("div");
    panel.className = "fb-speed-panel";
    overlay.appendChild(panel);

    const buttons = new Map();
    SPEEDS.forEach((speed) => {
      const btn = document.createElement("button");
      btn.className = "fb-speed-btn";
      btn.type = "button";
      btn.textContent = formatLabel(speed);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applySpeed(video, entry, speed);
        savePreferred(speed);
      });
      panel.appendChild(btn);
      buttons.set(speed, btn);
    });

    document.body.appendChild(overlay);

    const entry = { overlay, panel, buttons, currentSpeed: preferredSpeed };
    return entry;
  }

  function positionOverlay(video, entry) {
    if (!video.isConnected) {
      entry.overlay.remove();
      tracked.delete(video);
      return;
    }

    const rect = video.getBoundingClientRect();
    const visible =
      rect.width > 40 &&
      rect.height > 40 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;

    if (!visible) {
      entry.overlay.style.display = "none";
      return;
    }

    entry.overlay.style.display = "block";
    entry.overlay.style.top = `${rect.top}px`;
    entry.overlay.style.left = `${rect.left}px`;
    entry.overlay.style.width = `${rect.width}px`;
    entry.overlay.style.height = `${rect.height}px`;
  }

  function trackVideo(video) {
    if (tracked.has(video)) return;
    if (!video.isConnected) return;

    const entry = createOverlay(video);
    tracked.set(video, entry);

    // Re-assert our chosen speed if Facebook resets playbackRate
    // (e.g. on ad boundaries or src swaps).
    video.addEventListener("play", () => {
      if (video.playbackRate !== entry.currentSpeed) {
        video.playbackRate = entry.currentSpeed;
      }
    });
    video.addEventListener("loadedmetadata", () => {
      applySpeed(video, entry, entry.currentSpeed);
    });

    applySpeed(video, entry, preferredSpeed);
    positionOverlay(video, entry);
  }

  function scanForVideos(root = document) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("video").forEach((video) => trackVideo(video));
  }

  // Keep in sync if the default speed is changed from the popup
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        preferredSpeed = changes[STORAGE_KEY].newValue;
        tracked.forEach((entry, video) => applySpeed(video, entry, preferredSpeed));
      }
    });
  } catch (e) {}

  // Initial scan
  scanForVideos();

  // Watch for videos added dynamically (feed scroll, reels, watch page, etc.)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === "VIDEO") {
          trackVideo(node);
        } else if (node.querySelectorAll) {
          scanForVideos(node);
        }
      });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Periodic safety sweep in case MutationObserver misses something,
  // and continuous repositioning of overlays to track scroll/resize/
  // layout changes (feed virtualization, entering/exiting fullscreen, etc).
  setInterval(() => {
    scanForVideos();
    tracked.forEach((entry, video) => positionOverlay(video, entry));
  }, 150);
})();
