let scale = 1,
  offsetX = 0,
  offsetY = 0;
let isDraggingFrame = false,
  isDraggingImage = false,
  startX,
  startY;
let frameStartX, frameStartY;

const img = document.getElementById("target-image");
const frame = document.getElementById("crop-frame");
const overlay = document.getElementById("overlay");

// Constants for 16:9 aspect ratio
const ASPECT_RATIO = 16 / 9;
const MIN_FRAME_WIDTH = 100;
const MAX_ZOOM = 5;
const MIN_ZOOM = 0.1;

// Initialize when image loads
img.onload = () => {
  // Reset positioning
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  // Get viewport and image dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Calculate scale to fit image in viewport
  const scaleToFit = Math.min(
    (viewportWidth * 0.9) / imgWidth,
    (viewportHeight * 0.9) / imgHeight
  );

  scale = scaleToFit;

  // Center the image
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;
  offsetX = (viewportWidth - scaledWidth) / 2;
  offsetY = (viewportHeight - scaledHeight) / 2;

  img.style.position = "absolute";
  img.style.left = "0px";
  img.style.top = "0px";
  img.style.transformOrigin = "top left";
  updateTransform();

  // Initialize crop frame to fit entire image with 16:9 constraint
  initializeCropFrame(scaledWidth, scaledHeight);
};

function initializeCropFrame(imageWidth, imageHeight) {
  // Calculate the largest 16:9 frame that fits within the image
  let frameWidth, frameHeight;

  // Check if image is wider than 16:9
  if (imageWidth / imageHeight > ASPECT_RATIO) {
    // Image is wider, so height is the constraint
    frameHeight = imageHeight;
    frameWidth = frameHeight * ASPECT_RATIO;
  } else {
    // Image is taller, so width is the constraint
    frameWidth = imageWidth;
    frameHeight = frameWidth / ASPECT_RATIO;
  }

  // Center the frame on the image
  const imgRect = img.getBoundingClientRect();
  const frameLeft = imgRect.left + (imageWidth - frameWidth) / 2;
  const frameTop = imgRect.top + (imageHeight - frameHeight) / 2;

  frame.style.width = `${frameWidth}px`;
  frame.style.height = `${frameHeight}px`;
  frame.style.left = `${frameLeft}px`;
  frame.style.top = `${frameTop}px`;
}

function updateTransform() {
  if (!img) return;
  img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  constrainCropFrame();
}

function constrainCropFrame() {
  const imgRect = img.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();

  let newLeft = parseFloat(frame.style.left);
  let newTop = parseFloat(frame.style.top);
  let newWidth = frameRect.width;
  let newHeight = frameRect.height;

  // Ensure frame doesn't exceed image boundaries
  if (frameRect.left < imgRect.left) {
    newLeft = imgRect.left;
  }
  if (frameRect.top < imgRect.top) {
    newTop = imgRect.top;
  }
  if (frameRect.right > imgRect.right) {
    newLeft = imgRect.right - frameRect.width;
  }
  if (frameRect.bottom > imgRect.bottom) {
    newTop = imgRect.bottom - frameRect.height;
  }

  // Check if frame is larger than image and resize if necessary
  if (frameRect.width > imgRect.width) {
    newWidth = imgRect.width;
    newHeight = newWidth / ASPECT_RATIO;
  }
  if (frameRect.height > imgRect.height) {
    newHeight = imgRect.height;
    newWidth = newHeight * ASPECT_RATIO;
  }

  frame.style.left = `${newLeft}px`;
  frame.style.top = `${newTop}px`;
  frame.style.width = `${newWidth}px`;
  frame.style.height = `${newHeight}px`;
}

// Crop frame dragging with constraints
frame.addEventListener("mousedown", (e) => {
  if (e.target === frame) {
    isDraggingFrame = true;
    frameStartX = e.clientX - parseInt(frame.style.left);
    frameStartY = e.clientY - parseInt(frame.style.top);
    e.preventDefault();
    frame.style.cursor = "grabbing";
  }
});

// Image panning
overlay.addEventListener("mousedown", (e) => {
  if (e.target === overlay) {
    isDraggingImage = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    e.preventDefault();
    overlay.style.cursor = "grabbing";
  }
});

window.addEventListener("mousemove", (e) => {
  if (isDraggingFrame) {
    const imgRect = img.getBoundingClientRect();
    const frameWidth = frame.offsetWidth;
    const frameHeight = frame.offsetHeight;

    // Calculate new position
    let newLeft = e.clientX - frameStartX;
    let newTop = e.clientY - frameStartY;

    // Constrain to image boundaries
    newLeft = Math.max(
      imgRect.left,
      Math.min(imgRect.right - frameWidth, newLeft)
    );
    newTop = Math.max(
      imgRect.top,
      Math.min(imgRect.bottom - frameHeight, newTop)
    );

    frame.style.left = `${newLeft}px`;
    frame.style.top = `${newTop}px`;
  } else if (isDraggingImage) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    updateTransform();
  }
});

window.addEventListener("mouseup", () => {
  isDraggingFrame = false;
  isDraggingImage = false;
  frame.style.cursor = "move";
  overlay.style.cursor = "grab";
});

// Zoom functionality with crop frame constraint
window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale + delta));

    // Get mouse position relative to image
    const rect = img.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate offset adjustment to zoom towards mouse
    const scaleRatio = newScale / scale;
    offsetX = offsetX - mouseX * (scaleRatio - 1);
    offsetY = offsetY - mouseY * (scaleRatio - 1);

    scale = newScale;
    updateTransform();

    // Adjust crop frame if it exceeds new image boundaries
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    const frameRect = frame.getBoundingClientRect();

    if (frameRect.width > scaledWidth || frameRect.height > scaledHeight) {
      initializeCropFrame(scaledWidth, scaledHeight);
    }
  },
  { passive: false }
);

// Save cropped image with original quality
document.getElementById("save-crop-button").addEventListener("click", () => {
  const frameRect = frame.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  // Calculate source coordinates in original image space
  const sx = (frameRect.left - imgRect.left) / scale / img.naturalWidth;
  const sy = (frameRect.top - imgRect.top) / scale / img.naturalHeight;
  const sw = frameRect.width / scale / img.naturalWidth;
  const sh = frameRect.height / scale / img.naturalHeight;

  // Create high-resolution canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size to maintain original quality
  const outputWidth = img.naturalWidth * sw;
  const outputHeight = img.naturalHeight * sh;

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Enable high quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Create new image to ensure cross-origin compatibility
  const tmpImg = new Image();
  tmpImg.crossOrigin = "anonymous";

  tmpImg.onload = () => {
    // Draw the cropped portion at full resolution
    ctx.drawImage(
      tmpImg,
      sx * tmpImg.naturalWidth,
      sy * tmpImg.naturalHeight,
      sw * tmpImg.naturalWidth,
      sh * tmpImg.naturalHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    // Export as high-quality PNG
    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `cropped-16x9-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      },
      "image/png",
      1.0
    );
  };

  tmpImg.onerror = () => {
    alert("Error loading image for cropping. Please try again.");
  };

  tmpImg.src = img.src;
});

// Close button handler
document.getElementById("close-button").addEventListener("click", () => {
  window.parent.postMessage({ type: "CLOSE_CROPPER" }, "*");
});

// Handle messages from parent window
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "START_CROPPER") {
    const img = document.getElementById("target-image");
    if (img) {
      img.src = event.data.src;
    }
  }
});
