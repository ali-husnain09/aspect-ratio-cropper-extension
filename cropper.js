let scale = 1,
  offsetX = 0,
  offsetY = 0;
let dragging = false,
  startX,
  startY;

const img = document.getElementById("target-image");
const frame = document.getElementById("crop-frame");

img.onload = () => {
  const frameRect = frame.getBoundingClientRect();
  img.style.left = `${frameRect.left}px`;
  img.style.top = `${frameRect.top}px`;
  img.style.transformOrigin = "top left";
  updateTransform();
};

function updateTransform() {
  img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

frame.addEventListener("mousedown", (e) => {
  dragging = true;
  startX = e.clientX - frame.offsetLeft;
  startY = e.clientY - frame.offsetTop;
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const x = e.clientX - startX;
  const y = e.clientY - startY;
  frame.style.left = `${x}px`;
  frame.style.top = `${y}px`;
});

window.addEventListener("mouseup", () => (dragging = false));

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    scale = Math.max(0.1, scale + delta);
    updateTransform();
  },
  { passive: false }
);

document.getElementById("save-crop-button").addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  const frameRect = frame.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  const sx = (frameRect.left - imgRect.left) / scale;
  const sy = (frameRect.top - imgRect.top) / scale;
  const sw = frameRect.width / scale;
  const sh = frameRect.height / scale;

  canvas.width = frameRect.width;
  canvas.height = frameRect.height;
  const ctx = canvas.getContext("2d");

  const tmpImg = new Image();
  tmpImg.crossOrigin = "anonymous";
  tmpImg.src = img.src;
  tmpImg.onload = () => {
    ctx.drawImage(tmpImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = "cropped.png";
    link.href = canvas.toDataURL();
    link.click();
  };
});

document.getElementById("close-button").addEventListener("click", () => {
  window.parent.postMessage({ type: "CLOSE_CROPPER" }, "*");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_CROP") {
    const img = document.querySelector("img");

    if (!img) return alert("No image found.");

    if (!img.complete) {
      img.onload = () => injectCropper(img);
    } else {
      injectCropper(img);
    }
  }
});

function injectCropper(img) {
  const imgSrc = img.src;

  fetch(chrome.runtime.getURL("cropper.html"))
    .then((res) => res.text())
    .then((html) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.innerHTML = "";
      document.body.appendChild(wrapper);

      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = chrome.runtime.getURL("cropper.css");
      document.head.appendChild(style);

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("cropper.js");
      script.onload = () => {
        window.__INJECTED_IMAGE_SRC__ = imgSrc;
        if (typeof window.initCropper === "function") {
          window.initCropper(imgSrc); // optional
        }
      };
      document.body.appendChild(script);
    });
}

window.initCropper = function (src) {
  const img = document.getElementById("target-image");
  if (!img) return console.error("Image element not found");
  img.src = src;

  img.onload = () => {
    const frame = document.getElementById("crop-frame");
    if (!frame) return console.error("Crop frame not found");

    const frameRect = frame.getBoundingClientRect();
    img.style.position = "absolute";
    img.style.left = `${frameRect.left}px`;
    img.style.top = `${frameRect.top}px`;
    img.style.transformOrigin = "top left";
    updateTransform();
  };
};
function updateTransform() {
  const img = document.getElementById("target-image");
  if (!img) return;
  img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "START_CROPPER") {
    const img = document.getElementById("target-image");
    if (img) img.src = event.data.src;
  }
});
