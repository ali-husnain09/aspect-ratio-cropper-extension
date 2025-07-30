let storedImageData = null;

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ACTIVATE_CROPPER") {
    storedImageData = event.data.imageData;
    openCropper(event.data.imageData);
  }
  if (event.data && event.data.type === "CLOSE_CROPPER") {
    const iframe = document.getElementById("cropper-frame");
    if (iframe) {
      iframe.remove();
    }
    storedImageData = null;
  }
});

async function openCropper(imageData) {
  // Remove existing iframe if present
  const existingIframe = document.getElementById("cropper-frame");
  if (existingIframe) existingIframe.remove();

  try {
    // Get the cropper URL from background script
    const response = await chrome.runtime.sendMessage({
      action: "getCropperURL",
    });

    if (!response || !response.url) {
      throw new Error("Failed to get cropper URL");
    }

    // Create iframe with fade-in effect
    const iframe = document.createElement("iframe");
    iframe.src = response.url;
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
          { type: "START_CROPPER", imageData: imageData },
          "*"
        );
      }, 50);
    };

    iframe.onerror = () => {
      console.error("Failed to load cropper interface");
      iframe.remove();
      alert("Failed to open image editor. Please try again.");
    };
  } catch (error) {
    console.error("Error opening cropper:", error);
    alert("Failed to open image editor. Please try again.");
  }
}

// Handle download requests from cropper
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DOWNLOAD_IMAGE") {
    chrome.runtime.sendMessage(
      {
        action: "download",
        dataUrl: event.data.dataUrl,
      },
      (response) => {
        if (response && response.success) {
          // Send success message back to cropper
          const iframe = document.getElementById("cropper-frame");
          if (iframe) {
            iframe.contentWindow.postMessage({ type: "DOWNLOAD_SUCCESS" }, "*");
          }
        } else {
          console.error("Download failed:", response?.error);
          const iframe = document.getElementById("cropper-frame");
          if (iframe) {
            iframe.contentWindow.postMessage(
              {
                type: "DOWNLOAD_ERROR",
                error: response?.error || "Unknown error",
              },
              "*"
            );
          }
        }
      }
    );
  }
});
