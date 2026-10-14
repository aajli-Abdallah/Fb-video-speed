const SETTINGS_KEY = "fbSpeedSettings";
const LEGACY_STORAGE_KEY = "fbPreferredSpeed";

const DEFAULT_SETTINGS = {
  enabled: true,
  preferredSpeed: 1,
  presets: [0.75, 1, 1.25, 1.5, 1.75, 2],
  uiMode: "compact",
  autoHide: true,
  position: "top-right",
  audioBoost: 100,
  showSeekButtons: true,
  showPipButton: true,
  showScreenshotButton: true
};

let currentSettings = { ...DEFAULT_SETTINGS };

// DOM Elements
const masterToggle = document.getElementById("masterToggle");
const currentSpeedLabel = document.getElementById("currentSpeedLabel");
const speedSlider = document.getElementById("speedSlider");
const presetsContainer = document.getElementById("presetsContainer");
const presetsInput = document.getElementById("presetsInput");
const savePresetsBtn = document.getElementById("savePresetsBtn");

const audioBoostSlider = document.getElementById("audioBoostSlider");
const audioBoostLabel = document.getElementById("audioBoostLabel");

const seekButtonsToggle = document.getElementById("seekButtonsToggle");
const pipButtonToggle = document.getElementById("pipButtonToggle");
const screenshotButtonToggle = document.getElementById("screenshotButtonToggle");

const uiModeSelect = document.getElementById("uiModeSelect");
const autoHideToggle = document.getElementById("autoHideToggle");
const positionSelect = document.getElementById("positionSelect");

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
  currentSettings = { ...currentSettings, ...patch };
  const storage = getStorageArea();
  if (storage) {
    try {
      storage.set({ [SETTINGS_KEY]: currentSettings });
    } catch (e) {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [SETTINGS_KEY]: currentSettings });
      }
    }
  }
}

function formatLabel(speed) {
  const num = Number(speed);
  return `${num.toFixed(2)}x`;
}

function renderUI() {
  masterToggle.checked = Boolean(currentSettings.enabled);
  currentSpeedLabel.textContent = formatLabel(currentSettings.preferredSpeed);
  speedSlider.value = currentSettings.preferredSpeed;

  // Audio Boost
  audioBoostSlider.value = currentSettings.audioBoost || 100;
  audioBoostLabel.textContent =
    currentSettings.audioBoost > 100 ? `${currentSettings.audioBoost}%` : "100% (Normal)";

  // Toggles
  seekButtonsToggle.checked = Boolean(currentSettings.showSeekButtons);
  pipButtonToggle.checked = Boolean(currentSettings.showPipButton);
  screenshotButtonToggle.checked = Boolean(currentSettings.showScreenshotButton);

  // Display Settings
  uiModeSelect.value = currentSettings.uiMode || "compact";
  autoHideToggle.checked = Boolean(currentSettings.autoHide);
  positionSelect.value = currentSettings.position || "top-right";

  // Presets
  presetsInput.value = (currentSettings.presets || DEFAULT_SETTINGS.presets).join(", ");
  renderPresets();
}

function renderPresets() {
  presetsContainer.innerHTML = "";
  const list = currentSettings.presets && currentSettings.presets.length > 0
    ? currentSettings.presets
    : DEFAULT_SETTINGS.presets;

  list.forEach((speed) => {
    const btn = document.createElement("button");
    btn.className = "preset-btn";
    btn.textContent = speed === 1 ? "1x" : `${speed}x`;
    if (Math.abs(speed - currentSettings.preferredSpeed) < 0.02) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      updateSpeed(speed);
    });
    presetsContainer.appendChild(btn);
  });
}

function updateSpeed(speed) {
  const clamped = Math.max(0.25, Math.min(4.0, parseFloat(Number(speed).toFixed(2))));
  currentSettings.preferredSpeed = clamped;
  currentSpeedLabel.textContent = formatLabel(clamped);
  speedSlider.value = clamped;
  renderPresets();
  saveSettings({ preferredSpeed: clamped });
}

// Speed Slider listeners
speedSlider.addEventListener("input", () => {
  const speed = parseFloat(speedSlider.value);
  currentSpeedLabel.textContent = formatLabel(speed);
  currentSettings.preferredSpeed = speed;
  renderPresets();
});

speedSlider.addEventListener("change", () => {
  const speed = parseFloat(speedSlider.value);
  updateSpeed(speed);
});

// Master toggle
masterToggle.addEventListener("change", () => {
  saveSettings({ enabled: masterToggle.checked });
});

// Audio Boost Slider
audioBoostSlider.addEventListener("input", () => {
  const val = parseInt(audioBoostSlider.value, 10);
  audioBoostLabel.textContent = val > 100 ? `${val}%` : "100% (Normal)";
});

audioBoostSlider.addEventListener("change", () => {
  const val = parseInt(audioBoostSlider.value, 10);
  saveSettings({ audioBoost: val });
});

// Tools Toggles
seekButtonsToggle.addEventListener("change", () => {
  saveSettings({ showSeekButtons: seekButtonsToggle.checked });
});

pipButtonToggle.addEventListener("change", () => {
  saveSettings({ showPipButton: pipButtonToggle.checked });
});

screenshotButtonToggle.addEventListener("change", () => {
  saveSettings({ showScreenshotButton: screenshotButtonToggle.checked });
});

// Presets Customizer
savePresetsBtn.addEventListener("click", () => {
  const raw = presetsInput.value;
  const parsed = raw
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n) && n >= 0.25 && n <= 4.0);

  const uniqueSorted = [...new Set(parsed)].sort((a, b) => a - b);
  if (uniqueSorted.length > 0) {
    currentSettings.presets = uniqueSorted;
    saveSettings({ presets: uniqueSorted });
    renderPresets();
    presetsInput.value = uniqueSorted.join(", ");
  }
});

// Display preferences
uiModeSelect.addEventListener("change", () => {
  saveSettings({ uiMode: uiModeSelect.value });
});

autoHideToggle.addEventListener("change", () => {
  saveSettings({ autoHide: autoHideToggle.checked });
});

positionSelect.addEventListener("change", () => {
  saveSettings({ position: positionSelect.value });
});

// Initialize
loadSettings((loaded) => {
  currentSettings = loaded;
  renderUI();
});


