const SETTINGS_KEY = "fbSpeedSettings";
const LEGACY_STORAGE_KEY = "fbPreferredSpeed";

const POPUP_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const DEFAULT_SETTINGS = {
  enabled: true,
  preferredSpeed: 1,
  presets: [0.75, 1, 1.25, 1.5, 1.75, 2],
  uiMode: "compact",
  autoHide: true,
  position: "top-right"
};

let currentSettings = { ...DEFAULT_SETTINGS };

const masterToggle = document.getElementById("masterToggle");
const currentSpeedLabel = document.getElementById("currentSpeedLabel");
const speedSlider = document.getElementById("speedSlider");
const presetsContainer = document.getElementById("presetsContainer");
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
  uiModeSelect.value = currentSettings.uiMode || "compact";
  autoHideToggle.checked = Boolean(currentSettings.autoHide);
  positionSelect.value = currentSettings.position || "top-right";

  renderPresets();
}

function renderPresets() {
  presetsContainer.innerHTML = "";
  POPUP_PRESETS.forEach((speed) => {
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

// Event Listeners
masterToggle.addEventListener("change", () => {
  saveSettings({ enabled: masterToggle.checked });
});

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

