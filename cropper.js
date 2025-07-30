let scale = 1,
  offsetX = 0,
  offsetY = 0;
let isDraggingFrame = false,
  isDraggingImage = false,
  startX,
  startY;
let frameStartX, frameStartY;
let storedImageData = null;

const img = document.getElementById("target-image");
const frame = document.getElementById("crop-frame");
const overlay = document.getElementById("overlay");

// Precise 16:9 aspect ratio
const ASPECT_RATIO = 16 / 9; // Exactly 1.7777777...
const MIN_FRAME_WIDTH = 100;
const MAX_ZOOM = 5;
const MIN_ZOOM = 0.1;

// Initialize when receiving image data (no reload needed)
function initializeWithImageData(imageData) {
  storedImageData = imageData;

  // Set image source without reloading
  img.src = imageData.src;

  // If image is already loaded in cache, initialize immediately
  if (img.complete && img.naturalWidth > 0) {
    initializeCropper();
  } else {
    img.onload = initializeCropper;
  }
}

function initializeCropper() {
  // Reset positioning
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  // Get viewport and image dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight - 80; // Account for toolbar
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

  // Initialize crop frame with precise 16:9 aspect ratio
  initializeCropFrame(scaledWidth, scaledHeight);
}

function initializeCropFrame(imageWidth, imageHeight) {
  // Calculate the largest precise 16:9 frame that fits within the image
  let frameWidth, frameHeight;

  // Check if image aspect ratio is wider or taller than 16:9
  const imageAspectRatio = imageWidth / imageHeight;

  if (imageAspectRatio > ASPECT_RATIO) {
    // Image is wider than 16:9, so height is the constraint
    frameHeight = imageHeight * 0.8; // Use 80% of image height for better UX
    frameWidth = frameHeight * ASPECT_RATIO;
  } else {
    // Image is taller than 16:9, so width is the constraint
    frameWidth = imageWidth * 0.8; // Use 80% of image width for better UX
    frameHeight = frameWidth / ASPECT_RATIO;
  }

  // Ensure minimum size
  if (frameWidth < MIN_FRAME_WIDTH) {
    frameWidth = MIN_FRAME_WIDTH;
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

  // Check if frame is larger than image and resize maintaining exact 16:9
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

// Frame dragging with precise constraints
frame.addEventListener("mousedown", (e) => {
  if (e.target === frame || frame.contains(e.target)) {
    isDraggingFrame = true;
    frameStartX = e.clientX - parseInt(frame.style.left);
    frameStartY = e.clientY - parseInt(frame.style.top);
    e.preventDefault();
    e.stopPropagation();
    frame.style.cursor = "grabbing";
  }
});

// Image panning
overlay.addEventListener("mousedown", (e) => {
  if (e.target === overlay && !isDraggingFrame) {
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

    // Constrain to image boundaries with precise calculations
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

// Zoom functionality
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

// Fixed save functionality - single click, high quality, no popup
document
  .getElementById("save-crop-button")
  .addEventListener("click", async () => {
    if (!storedImageData) {
      alert("Image data not available. Please try again.");
      return;
    }

    const saveButton = document.getElementById("save-crop-button");
    const originalText = saveButton.innerHTML;

    // Show loading state
    saveButton.innerHTML = `⏳ Saving...`;
    saveButton.disabled = true;

    try {
      const frameRect = frame.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Calculate precise source coordinates in original image space
      const scaleRatio = 1 / scale;
      const sx = Math.max(0, (frameRect.left - imgRect.left) * scaleRatio);
      const sy = Math.max(0, (frameRect.top - imgRect.top) * scaleRatio);
      const sw = Math.min(
        storedImageData.naturalWidth - sx,
        frameRect.width * scaleRatio
      );
      const sh = Math.min(
        storedImageData.naturalHeight - sy,
        frameRect.height * scaleRatio
      );

      // Create high-resolution canvas with exact 16:9 dimensions
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Calculate output dimensions maintaining exact 16:9 ratio
      const maxOutputWidth = 1920; // HD resolution
      const outputHeight = maxOutputWidth / ASPECT_RATIO;
      const outputWidth = maxOutputWidth;

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // Enable high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill with black background to avoid any white space
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Create image element for cropping
      const cropImg = new Image();
      cropImg.crossOrigin = "anonymous";

      const cropPromise = new Promise((resolve, reject) => {
        cropImg.onload = () => {
          try {
            // Draw the cropped portion at exact 16:9 dimensions
            ctx.drawImage(
              cropImg,
              sx,
              sy,
              sw,
              sh,
              0,
              0,
              outputWidth,
              outputHeight
            );
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        cropImg.onerror = () => {
          reject(new Error("Failed to load image for cropping"));
        };
      });

      cropImg.src = storedImageData.src;
      await cropPromise;

      // Convert to blob and send for download
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error("Failed to create image blob");
          }

          const reader = new FileReader();
          reader.onload = () => {
            // Send download request to content script
            window.parent.postMessage(
              {
                type: "DOWNLOAD_IMAGE",
                dataUrl: reader.result,
              },
              "*"
            );
          };

          reader.onerror = () => {
            throw new Error("Failed to read image blob");
          };

          reader.readAsDataURL(blob);
        },
        "image/png",
        1.0
      );
    } catch (error) {
      console.error("Error during crop and save:", error);
      alert("Failed to save image. Please try again.");
    } finally {
      // Restore button state
      saveButton.innerHTML = originalText;
      saveButton.disabled = false;
    }
  });

// Handle download response
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DOWNLOAD_SUCCESS") {
    // Close cropper after successful download
    setTimeout(() => {
      window.parent.postMessage({ type: "CLOSE_CROPPER" }, "*");
    }, 500);
  } else if (event.data && event.data.type === "DOWNLOAD_ERROR") {
    alert(`Download failed: ${event.data.error}`);
  }
});

// Close button handler
document.getElementById("close-button").addEventListener("click", () => {
  window.parent.postMessage({ type: "CLOSE_CROPPER" }, "*");
});

// Handle messages from parent window
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "START_CROPPER") {
    initializeWithImageData(event.data.imageData);
  }
});
