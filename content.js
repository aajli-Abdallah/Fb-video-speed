(() => {
  const SETTINGS_KEY = "fbSpeedSettings";
  const LEGACY_STORAGE_KEY = "fbPreferredSpeed";

  const DEFAULT_SETTINGS = {
    enabled: true,
    preferredSpeed: 1,
    presets: [0.75, 1, 1.25, 1.5, 1.75, 2],
    uiMode: "compact", // "compact" or "expanded"
    autoHide: true,
    position: "top-right" // "top-right", "top-left", "bottom-right", "bottom-left"
  };

  let settings = { ...DEFAULT_SETTINGS };

  // videoEl -> entry object
  const tracked = new Map();

  function getStorageArea() {
    try {
      if (chrome.storage && chrome.storage.sync) return chrome.storage.sync;
      if (chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (e) {}
    return null;
  }

  function loadSettings(cb) {
    const storage = getStorageArea();
    if (!storage) {
      cb({ ...DEFAULT_SETTINGS });
      return;
    }
    try {
      storage.get([SETTINGS_KEY, LEGACY_STORAGE_KEY], (res) => {
        let merged = { ...DEFAULT_SETTINGS };
        if (res && res[SETTINGS_KEY]) {
          merged = { ...DEFAULT_SETTINGS, ...res[SETTINGS_KEY] };
        } else if (res && res[LEGACY_STORAGE_KEY]) {
          merged.preferredSpeed = res[LEGACY_STORAGE_KEY];
        }
        cb(merged);
      });
    } catch (e) {
      cb({ ...DEFAULT_SETTINGS });
    }
  }

  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    const storage = getStorageArea();
    if (storage) {
      try {
        storage.set({ [SETTINGS_KEY]: settings });
      } catch (e) {
        if (chrome.storage && chrome.storage.local) {
          try {
            chrome.storage.local.set({ [SETTINGS_KEY]: settings });
          } catch (err) {}
        }
      }
    }
  }

  function formatLabel(speed) {
    const s = Number(speed);
    return s === 1 ? "1x" : `${parseFloat(s.toFixed(2))}x`;
  }

  function applySpeed(video, entry, speed) {
    const clamped = Math.max(0.25, Math.min(4.0, parseFloat(Number(speed).toFixed(2))));
    entry.applyingSpeed = true;
    try {
      video.playbackRate = clamped;
    } catch (e) {}
    setTimeout(() => {
      entry.applyingSpeed = false;
    }, 50);

    entry.currentSpeed = clamped;

    // Update pill label
    if (entry.pillText) {
      entry.pillText.textContent = formatLabel(clamped);
    }

    // Update preset buttons active state
    entry.presetButtons.forEach((btn, s) => {
      btn.classList.toggle("fb-speed-active", Math.abs(s - clamped) < 0.01);
    });
  }

  function renderPresetButtons(video, entry) {
    entry.presetsContainer.innerHTML = "";
    entry.presetButtons.clear();

    settings.presets.forEach((speed) => {
      const btn = document.createElement("button");
      btn.className = "fb-speed-btn";
      btn.type = "button";
      btn.textContent = formatLabel(speed);
      if (Math.abs(speed - entry.currentSpeed) < 0.01) {
        btn.classList.add("fb-speed-active");
      }
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applySpeed(video, entry, speed);
        saveSettings({ preferredSpeed: speed });
      });
      entry.presetsContainer.appendChild(btn);
      entry.presetButtons.set(speed, btn);
    });
  }

  function triggerAutoHide(entry) {
    if (!settings.autoHide) {
      entry.overlay.classList.remove("fb-speed-autohide");
      entry.overlay.classList.add("fb-speed-visible");
      return;
    }

    entry.overlay.classList.remove("fb-speed-autohide");
    entry.overlay.classList.add("fb-speed-visible");

    clearTimeout(entry.hideTimeout);
    entry.hideTimeout = setTimeout(() => {
      if (!entry.isHovered) {
        entry.overlay.classList.remove("fb-speed-visible");
        entry.overlay.classList.add("fb-speed-autohide");
      }
    }, 2200);
  }

  function createOverlay(video) {
    const overlay = document.createElement("div");
    overlay.className = `fb-speed-overlay ${settings.autoHide ? "fb-speed-autohide" : "fb-speed-visible"}`;

    const panel = document.createElement("div");
    panel.className = `fb-speed-panel fb-pos-${settings.position} ${
      settings.uiMode === "compact" ? "fb-speed-compact" : ""
    }`;
    overlay.appendChild(panel);

    // Pill badge for compact mode
    const pillBadge = document.createElement("div");
    pillBadge.className = "fb-speed-pill-badge";
    pillBadge.title = "Click to toggle speed controls";
    pillBadge.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z"/></svg>
      <span class="fb-speed-pill-text">${formatLabel(settings.preferredSpeed)}</span>
    `;
    panel.appendChild(pillBadge);
    const pillText = pillBadge.querySelector(".fb-speed-pill-text");

    pillBadge.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.toggle("fb-expanded");
    });

    // Tray containing all speed controls
    const controlsTray = document.createElement("div");
    controlsTray.className = "fb-speed-controls-tray";
    panel.appendChild(controlsTray);

    // Decrement button (-0.1x)
    const minusBtn = document.createElement("button");
    minusBtn.className = "fb-speed-btn fb-speed-step-btn";
    minusBtn.type = "button";
    minusBtn.title = "Decrease speed (-0.1x)";
    minusBtn.textContent = "−";
    minusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = Math.max(0.25, parseFloat((entry.currentSpeed - 0.1).toFixed(2)));
      applySpeed(video, entry, next);
      saveSettings({ preferredSpeed: next });
    });
    controlsTray.appendChild(minusBtn);

    // Divider
    const div1 = document.createElement("div");
    div1.className = "fb-speed-divider";
    controlsTray.appendChild(div1);

    // Presets container
    const presetsContainer = document.createElement("div");
    presetsContainer.style.display = "flex";
    presetsContainer.style.gap = "3px";
    controlsTray.appendChild(presetsContainer);

    // Divider
    const div2 = document.createElement("div");
    div2.className = "fb-speed-divider";
    controlsTray.appendChild(div2);

    // Increment button (+0.1x)
    const plusBtn = document.createElement("button");
    plusBtn.className = "fb-speed-btn fb-speed-step-btn";
    plusBtn.type = "button";
    plusBtn.title = "Increase speed (+0.1x)";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = Math.min(4.0, parseFloat((entry.currentSpeed + 0.1).toFixed(2)));
      applySpeed(video, entry, next);
      saveSettings({ preferredSpeed: next });
    });
    controlsTray.appendChild(plusBtn);

    document.body.appendChild(overlay);

    const entry = {
      overlay,
      panel,
      pillBadge,
      pillText,
      controlsTray,
      presetsContainer,
      presetButtons: new Map(),
      currentSpeed: settings.preferredSpeed,
      inView: false,
      isHovered: false,
      hideTimeout: null,
      applyingSpeed: false
    };

    renderPresetButtons(video, entry);

    // Hover listeners on overlay and video for auto-hide
    overlay.addEventListener("mouseenter", () => {
      entry.isHovered = true;
      triggerAutoHide(entry);
    });
    overlay.addEventListener("mouseleave", () => {
      entry.isHovered = false;
      triggerAutoHide(entry);
    });

    const onActivity = () => triggerAutoHide(entry);
    video.addEventListener("mousemove", onActivity, { passive: true });
    video.addEventListener("mouseenter", onActivity, { passive: true });

    return entry;
  }

  function positionOverlay(video, entry) {
    if (!video.isConnected) {
      cleanUpVideo(video);
      return;
    }

    if (!settings.enabled || !entry.inView) {
      entry.overlay.style.display = "none";
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

  let repositionScheduled = false;
  function scheduleReposition() {
    if (repositionScheduled) return;
    repositionScheduled = true;
    requestAnimationFrame(() => {
      repositionScheduled = false;
      tracked.forEach((entry, video) => {
        if (entry.inView) {
          positionOverlay(video, entry);
        }
      });
    });
  }

  // Observers for high performance
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((change) => {
        const entry = tracked.get(change.target);
        if (entry) {
          entry.inView = change.isIntersecting;
          positionOverlay(change.target, entry);
        }
      });
    },
    { threshold: [0, 0.1] }
  );

  let resizeObserver = null;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((change) => {
        const entry = tracked.get(change.target);
        if (entry && entry.inView) {
          scheduleReposition();
        }
      });
    });
  }

  function cleanUpVideo(video) {
    const entry = tracked.get(video);
    if (!entry) return;
    try {
      intersectionObserver.unobserve(video);
      if (resizeObserver) resizeObserver.unobserve(video);
      clearTimeout(entry.hideTimeout);
      entry.overlay.remove();
    } catch (e) {}
    tracked.delete(video);
  }

  function trackVideo(video) {
    if (tracked.has(video)) return;
    if (!video.isConnected) return;

    const entry = createOverlay(video);
    tracked.set(video, entry);

    intersectionObserver.observe(video);
    if (resizeObserver) resizeObserver.observe(video);

    // Re-assert our chosen speed if Facebook resets playbackRate
    video.addEventListener("play", () => {
      if (settings.enabled && !entry.applyingSpeed && video.playbackRate !== entry.currentSpeed) {
        video.playbackRate = entry.currentSpeed;
      }
    });

    video.addEventListener("ratechange", () => {
      if (
        settings.enabled &&
        !entry.applyingSpeed &&
        video.playbackRate !== entry.currentSpeed &&
        !video.paused
      ) {
        video.playbackRate = entry.currentSpeed;
      }
    });

    video.addEventListener("loadedmetadata", () => {
      if (settings.enabled) {
        applySpeed(video, entry, entry.currentSpeed);
      }
    });

    if (settings.enabled) {
      applySpeed(video, entry, settings.preferredSpeed);
    }

    positionOverlay(video, entry);
  }

  function scanForVideos(root = document) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("video").forEach((video) => trackVideo(video));
  }

  function updateAllSettings(newSettings) {
    settings = { ...settings, ...newSettings };

    tracked.forEach((entry, video) => {
      // Update UI classes
      entry.panel.className = `fb-speed-panel fb-pos-${settings.position} ${
        settings.uiMode === "compact" ? "fb-speed-compact" : ""
      }`;

      // Auto-hide
      if (settings.autoHide) {
        entry.overlay.classList.add("fb-speed-autohide");
        entry.overlay.classList.remove("fb-speed-visible");
      } else {
        entry.overlay.classList.remove("fb-speed-autohide");
        entry.overlay.classList.add("fb-speed-visible");
      }

      // Re-render presets
      renderPresetButtons(video, entry);

      // Apply speed if enabled
      if (settings.enabled) {
        applySpeed(video, entry, settings.preferredSpeed);
      }
      positionOverlay(video, entry);
    });
  }

  // Load initial settings
  loadSettings((loaded) => {
    settings = loaded;
    scanForVideos();
    scheduleReposition();
  });

  // Listen for storage changes from popup
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[SETTINGS_KEY]) {
        updateAllSettings(changes[SETTINGS_KEY].newValue);
      } else if (changes[LEGACY_STORAGE_KEY]) {
        updateAllSettings({ preferredSpeed: changes[LEGACY_STORAGE_KEY].newValue });
      }
    });
  } catch (e) {}

  // Watch for videos added dynamically (feed scroll, reels, watch page, etc.)
  const mutationObserver = new MutationObserver((mutations) => {
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

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Passive scroll and resize listeners
  window.addEventListener("scroll", scheduleReposition, { passive: true });
  window.addEventListener("resize", scheduleReposition, { passive: true });

  // Low-frequency safety sweep (every 2.5s instead of aggressive 150ms)
  setInterval(() => {
    scanForVideos();
  }, 2500);
})();
