(() => {
  const SETTINGS_KEY = "fbSpeedSettings";
  const LEGACY_STORAGE_KEY = "fbPreferredSpeed";

  const DEFAULT_SETTINGS = {
    enabled: true,
    preferredSpeed: 1,
    presets: [0.75, 1, 1.25, 1.5, 1.75, 2],
    uiMode: "compact", // "compact" or "expanded"
    autoHide: true,
    position: "top-right", // "top-right", "top-left", "bottom-right", "bottom-left"
    audioBoost: 100, // 100 to 300 (%)
    keepReelsNormal: true,
    showSeekButtons: true,
    showPipButton: true,
    showScreenshotButton: true
  };

  let settings = { ...DEFAULT_SETTINGS };

  // videoEl -> entry object
  const tracked = new Map();

  // WeakMap for Web Audio nodes per video element: video -> { ctx, gainNode, isHooked }
  const audioNodes = new WeakMap();

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

  function isReelVideo(video) {
    if (window.location.pathname.includes("/reel/") || window.location.pathname.includes("/reels/")) {
      return true;
    }
    const reelAncestor = video.closest('[role="article"]') || video.closest('[aria-label*="Reel" i]');
    if (
      reelAncestor &&
      (reelAncestor.getAttribute("aria-label")?.toLowerCase().includes("reel") ||
        reelAncestor.querySelector('[href*="/reel/"]'))
    ) {
      return true;
    }
    if (video.videoWidth > 0 && video.videoHeight > 0 && video.videoHeight / video.videoWidth > 1.25) {
      return true;
    }
    return false;
  }

  function isLiveVideo(video) {
    if (video.duration === Infinity || isNaN(video.duration)) return true;
    if (video.closest('[aria-label*="Live" i]') || video.closest('[data-video-type="live"]')) return true;
    return false;
  }

  function getTargetSpeedForVideo(video, entry) {
    if (entry && typeof entry.userChosenSpeed === "number") {
      return entry.userChosenSpeed;
    }
    if (isLiveVideo(video)) return 1.0;
    if (settings.keepReelsNormal && isReelVideo(video)) return 1.0;
    return settings.preferredSpeed;
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

    if (entry.pillText) {
      entry.pillText.textContent = formatLabel(clamped);
    }

    entry.presetButtons.forEach((btn, s) => {
      btn.classList.toggle("fb-speed-active", Math.abs(s - clamped) < 0.01);
    });
  }

  function applyAudioBoost(video, boostPercent) {
    const boost = Math.max(100, Math.min(300, boostPercent || 100));
    const gainValue = boost / 100;

    let data = audioNodes.get(video);
    if (!data) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(video);
        const gainNode = ctx.createGain();
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        data = { ctx, gainNode };
        audioNodes.set(video, data);

        const resumeAudio = () => {
          if (ctx.state === "suspended") ctx.resume();
        };
        video.addEventListener("play", resumeAudio);
        window.addEventListener("click", resumeAudio, { once: true });
      } catch (e) {
        return;
      }
    }

    if (data && data.gainNode) {
      try {
        data.gainNode.gain.value = gainValue;
        if (data.ctx.state === "suspended") data.ctx.resume();
      } catch (e) {}
    }
  }

  async function togglePiP(video) {
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PiP not available:", e);
    }
  }

  function captureScreenshot(video, panel) {
    try {
      const width = video.videoWidth || video.clientWidth || 1280;
      const height = video.videoHeight || video.clientHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast(panel, "⚠️ Capture error");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fb-frame-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(panel, "📸 Snapshot saved!");
      }, "image/png");
    } catch (e) {
      showToast(panel, "⚠️ Protected stream");
    }
  }

  function seekVideo(video, seconds) {
    try {
      const current = video.currentTime || 0;
      const duration = video.duration || Infinity;
      video.currentTime = Math.max(0, Math.min(duration, current + seconds));
    } catch (e) {}
  }

  function showToast(panel, msg) {
    const toast = document.createElement("div");
    toast.className = "fb-speed-toast";
    toast.textContent = msg;
    panel.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
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
        entry.userChosenSpeed = speed;
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

    const targetSpeed = getTargetSpeedForVideo(video);

    // Pill badge for compact mode
    const pillBadge = document.createElement("div");
    pillBadge.className = "fb-speed-pill-badge";
    pillBadge.title = "Click to toggle video controls";
    pillBadge.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z"/></svg>
      <span class="fb-speed-pill-text">${formatLabel(targetSpeed)}</span>
    `;
    panel.appendChild(pillBadge);
    const pillText = pillBadge.querySelector(".fb-speed-pill-text");

    pillBadge.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.toggle("fb-expanded");
    });

    // Tray containing all speed controls & tools
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
      entry.userChosenSpeed = next;
      applySpeed(video, entry, next);
      saveSettings({ preferredSpeed: next });
    });
    controlsTray.appendChild(minusBtn);

    // Presets container
    const presetsContainer = document.createElement("div");
    presetsContainer.style.display = "flex";
    presetsContainer.style.gap = "3px";
    controlsTray.appendChild(presetsContainer);

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
      entry.userChosenSpeed = next;
      applySpeed(video, entry, next);
      saveSettings({ preferredSpeed: next });
    });
    controlsTray.appendChild(plusBtn);

    // Seek buttons (-5s, +5s)
    const seekTray = document.createElement("div");
    seekTray.style.display = settings.showSeekButtons ? "flex" : "none";
    seekTray.style.alignItems = "center";
    seekTray.style.gap = "3px";

    const divSeek = document.createElement("div");
    divSeek.className = "fb-speed-divider";
    seekTray.appendChild(divSeek);

    const rewindBtn = document.createElement("button");
    rewindBtn.className = "fb-util-btn";
    rewindBtn.title = "Rewind 5 seconds";
    rewindBtn.textContent = "−5s";
    rewindBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      seekVideo(video, -5);
    });
    seekTray.appendChild(rewindBtn);

    const fwdBtn = document.createElement("button");
    fwdBtn.className = "fb-util-btn";
    fwdBtn.title = "Skip forward 5 seconds";
    fwdBtn.textContent = "+5s";
    fwdBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      seekVideo(video, 5);
    });
    seekTray.appendChild(fwdBtn);

    controlsTray.appendChild(seekTray);

    // Pro tools tray (PiP, Screenshot, Audio)
    const toolsTray = document.createElement("div");
    toolsTray.style.display = "flex";
    toolsTray.style.alignItems = "center";
    toolsTray.style.gap = "3px";

    const divTools = document.createElement("div");
    divTools.className = "fb-speed-divider";
    toolsTray.appendChild(divTools);

    // PiP Button
    const pipBtn = document.createElement("button");
    pipBtn.className = "fb-util-btn";
    pipBtn.title = "Picture-in-Picture floating player";
    pipBtn.style.display = settings.showPipButton ? "inline-flex" : "none";
    pipBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
    pipBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePiP(video);
    });
    toolsTray.appendChild(pipBtn);

    // Screenshot Button
    const shotBtn = document.createElement("button");
    shotBtn.className = "fb-util-btn";
    shotBtn.title = "Save high-resolution video frame screenshot";
    shotBtn.style.display = settings.showScreenshotButton ? "inline-flex" : "none";
    shotBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm7-10h-3.17L14 3H10L8.17 5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 14H5V7h3.88l1.83-2h4.58l1.83 2H19v12z"/></svg>`;
    shotBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      captureScreenshot(video, panel);
    });
    toolsTray.appendChild(shotBtn);

    // Audio Boost Toggle / Cycle Button
    const audioBtn = document.createElement("button");
    audioBtn.className = `fb-util-btn ${settings.audioBoost > 100 ? "fb-audio-active" : ""}`;
    audioBtn.title = "Audio Volume Boost (Click to cycle 100% -> 150% -> 200% -> 300%)";
    audioBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg><span class="fb-audio-label">${settings.audioBoost > 100 ? settings.audioBoost + "%" : ""}</span>`;
    audioBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const levels = [100, 150, 200, 300];
      const curIdx = levels.indexOf(settings.audioBoost);
      const nextLevel = levels[(curIdx + 1) % levels.length];
      saveSettings({ audioBoost: nextLevel });
      applyAudioBoost(video, nextLevel);
      showToast(panel, `🔊 Audio Boost: ${nextLevel}%`);
    });
    toolsTray.appendChild(audioBtn);

    controlsTray.appendChild(toolsTray);

    document.body.appendChild(overlay);

    const entry = {
      overlay,
      panel,
      pillBadge,
      pillText,
      controlsTray,
      presetsContainer,
      presetButtons: new Map(),
      seekTray,
      pipBtn,
      shotBtn,
      audioBtn,
      audioLabel: audioBtn.querySelector(".fb-audio-label"),
      currentSpeed: targetSpeed,
      userChosenSpeed: undefined,
      inView: false,
      isHovered: false,
      hideTimeout: null,
      applyingSpeed: false
    };

    renderPresetButtons(video, entry);

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

    const targetSpeed = getTargetSpeedForVideo(video, entry);

    video.addEventListener("play", () => {
      if (settings.enabled && !entry.applyingSpeed && Math.abs(video.playbackRate - entry.currentSpeed) > 0.01) {
        video.playbackRate = entry.currentSpeed;
      }
      if (settings.audioBoost > 100) {
        applyAudioBoost(video, settings.audioBoost);
      }
    });

    video.addEventListener("ratechange", () => {
      if (
        settings.enabled &&
        !entry.applyingSpeed &&
        Math.abs(video.playbackRate - entry.currentSpeed) > 0.01
      ) {
        video.playbackRate = entry.currentSpeed;
      }
    });

    video.addEventListener("loadedmetadata", () => {
      if (settings.enabled) {
        const currentTarget = getTargetSpeedForVideo(video, entry);
        applySpeed(video, entry, currentTarget);
      }
    });

    if (settings.enabled) {
      applySpeed(video, entry, targetSpeed);
      if (settings.audioBoost > 100) {
        applyAudioBoost(video, settings.audioBoost);
      }
    }

    positionOverlay(video, entry);
  }

  function scanForVideos(root = document) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("video").forEach((video) => trackVideo(video));
  }

  let lastPresetsJson = "";
  function updateAllSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    const presetsChanged = JSON.stringify(settings.presets) !== lastPresetsJson;
    lastPresetsJson = JSON.stringify(settings.presets);

    tracked.forEach((entry, video) => {
      entry.panel.className = `fb-speed-panel fb-pos-${settings.position} ${
        settings.uiMode === "compact" ? "fb-speed-compact" : ""
      }`;

      if (settings.autoHide) {
        entry.overlay.classList.add("fb-speed-autohide");
        entry.overlay.classList.remove("fb-speed-visible");
      } else {
        entry.overlay.classList.remove("fb-speed-autohide");
        entry.overlay.classList.add("fb-speed-visible");
      }

      if (entry.seekTray) {
        entry.seekTray.style.display = settings.showSeekButtons ? "flex" : "none";
      }
      if (entry.pipBtn) {
        entry.pipBtn.style.display = settings.showPipButton ? "inline-flex" : "none";
      }
      if (entry.shotBtn) {
        entry.shotBtn.style.display = settings.showScreenshotButton ? "inline-flex" : "none";
      }
      if (entry.audioBtn) {
        entry.audioBtn.classList.toggle("fb-audio-active", settings.audioBoost > 100);
        if (entry.audioLabel) {
          entry.audioLabel.textContent = settings.audioBoost > 100 ? `${settings.audioBoost}%` : "";
        }
      }

      if (presetsChanged) {
        renderPresetButtons(video, entry);
      } else {
        entry.presetButtons.forEach((btn, s) => {
          btn.classList.toggle("fb-speed-active", Math.abs(s - entry.currentSpeed) < 0.01);
        });
      }

      if (settings.enabled) {
        const target = getTargetSpeedForVideo(video, entry);
        applySpeed(video, entry, target);
        applyAudioBoost(video, settings.audioBoost);
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

  // Watch for videos added dynamically
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

  window.addEventListener("scroll", scheduleReposition, { passive: true });
  window.addEventListener("resize", scheduleReposition, { passive: true });

  setInterval(() => {
    scanForVideos();
  }, 2500);
})();
