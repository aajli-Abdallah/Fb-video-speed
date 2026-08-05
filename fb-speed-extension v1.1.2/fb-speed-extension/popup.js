const SPEEDS = [1, 1.2, 1.5, 1.7, 2];
const STORAGE_KEY = "fbPreferredSpeed";

const container = document.getElementById("speeds");

function render(current) {
  container.innerHTML = "";
  SPEEDS.forEach((speed) => {
    const btn = document.createElement("button");
    btn.textContent = speed === 1 ? "1x" : `${speed}x`;
    if (speed === current) btn.classList.add("active");
    btn.addEventListener("click", () => {
      chrome.storage.local.set({ [STORAGE_KEY]: speed }, () => {
        render(speed);
        // Any open Facebook tabs pick this up instantly via
        // chrome.storage.onChanged in content.js — no extra work needed.
      });
    });
    container.appendChild(btn);
  });
}

chrome.storage.local.get([STORAGE_KEY], (res) => {
  render(res[STORAGE_KEY] || 1);
});
