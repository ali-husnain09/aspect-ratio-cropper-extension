window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ACTIVATE_CROPPER") {
    injectCropTools(event.data.src);
  }
  if (event.data && event.data.type === "CLOSE_CROPPER") {
    const iframe = document.getElementById("cropper-frame");
    if (iframe) {
      iframe.remove();
    }
    // Remove the crop button as well
    const cropBtn = document.getElementById("crop-image-btn");
    if (cropBtn) {
      cropBtn.remove();
    }
  }
});

function injectCropTools(imageSrc) {
  // Remove existing button and iframe if present
  const existingBtn = document.getElementById("crop-image-btn");
  const existingIframe = document.getElementById("cropper-frame");

  if (existingBtn) existingBtn.remove();
  if (existingIframe) existingIframe.remove();

  // Create crop button with Windows 10 style
  const cropBtn = document.createElement("button");
  cropBtn.id = "crop-image-btn";
  cropBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
      <path d="M19 7h-1V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 13H9v-2h7c1.1 0 2-.9 2-2V9h1v11z"/>
    </svg>
    Edit & Crop (16:9)
  `;
  cropBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    background: #0078d4;
    color: #fff;
    cursor: pointer;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    align-items: center;
  `;

  // Add hover effects
  cropBtn.addEventListener("mouseenter", () => {
    cropBtn.style.background = "#106ebe";
    cropBtn.style.transform = "translateY(-2px)";
    cropBtn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
  });

  cropBtn.addEventListener("mouseleave", () => {
    cropBtn.style.background = "#0078d4";
    cropBtn.style.transform = "translateY(0)";
    cropBtn.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
  });

  cropBtn.onclick = () => openCropper(imageSrc);
  document.body.appendChild(cropBtn);
}

function openCropper(imageSrc) {
  // Remove existing iframe if present
  const existingIframe = document.getElementById("cropper-frame");
  if (existingIframe) existingIframe.remove();

  // Create iframe with fade-in effect
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("cropper.html");
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999999;
    border: none;
    background: #1e1e1e;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  iframe.id = "cropper-frame";
  document.body.appendChild(iframe);

  // Fade in effect
  setTimeout(() => {
    iframe.style.opacity = "1";
  }, 10);

  // Wait for iframe to load and send image data
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.postMessage(
        { type: "START_CROPPER", src: imageSrc },
        "*"
      );
    }, 100);
  };

  // Handle iframe load errors
  iframe.onerror = () => {
    console.error("Failed to load cropper interface");
    iframe.remove();
    alert("Failed to open image editor. Please try again.");
  };
}

// Auto-detect images on page and add crop button on hover
let currentHoveredImage = null;
let hoverTimeout = null;

document.addEventListener("mouseover", (e) => {
  if (e.target.tagName === "IMG" && e.target.src) {
    currentHoveredImage = e.target;

    // Clear any existing timeout
    if (hoverTimeout) clearTimeout(hoverTimeout);

    // Set a timeout to show the button after hovering for 500ms
    hoverTimeout = setTimeout(() => {
      if (currentHoveredImage === e.target) {
        showFloatingCropButton(e.target);
      }
    }, 500);
  }
});

document.addEventListener("mouseout", (e) => {
  if (e.target.tagName === "IMG") {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    currentHoveredImage = null;

    // Hide floating button
    const floatingBtn = document.getElementById("floating-crop-btn");
    if (floatingBtn) {
      floatingBtn.style.opacity = "0";
      setTimeout(() => floatingBtn.remove(), 200);
    }
  }
});

function showFloatingCropButton(img) {
  // Remove existing floating button
  const existingBtn = document.getElementById("floating-crop-btn");
  if (existingBtn) existingBtn.remove();

  const rect = img.getBoundingClientRect();

  // Only show button for reasonably sized images
  if (rect.width < 100 || rect.height < 100) return;

  const btn = document.createElement("button");
  btn.id = "floating-crop-btn";
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 7h-1V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 13H9v-2h7c1.1 0 2-.9 2-2V9h1v11z"/>
    </svg>
  `;
  btn.style.cssText = `
    position: absolute;
    top: ${rect.top + window.scrollY + 10}px;
    right: ${window.innerWidth - rect.right + window.scrollX + 10}px;
    z-index: 999998;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    background: rgba(0, 120, 212, 0.9);
    color: white;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;

  btn.onclick = (e) => {
    e.stopPropagation();
    openCropper(img.src);
  };

  document.body.appendChild(btn);

  // Fade in
  setTimeout(() => {
    btn.style.opacity = "1";
  }, 10);
}
