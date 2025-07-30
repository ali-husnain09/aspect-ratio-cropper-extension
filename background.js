// Background script to handle extension icon clicks and downloads
chrome.action.onClicked.addListener((tab) => {
  // Inject and execute the cropper directly when extension icon is clicked
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: initiateCropping,
  });
});

function initiateCropping() {
  // Find the largest visible image on the page
  const images = Array.from(document.querySelectorAll("img")).filter((img) => {
    const rect = img.getBoundingClientRect();
    return (
      rect.width > 100 &&
      rect.height > 100 &&
      img.src &&
      rect.top < window.innerHeight &&
      rect.bottom > 0
    );
  });

  if (images.length === 0) {
    alert("No suitable images found on this page!");
    return;
  }

  // Get the largest image
  const targetImage = images.reduce((largest, current) => {
    const largestArea = largest.naturalWidth * largest.naturalHeight;
    const currentArea = current.naturalWidth * current.naturalHeight;
    return currentArea > largestArea ? current : largest;
  });

  // Store image data to avoid reloading
  const imageData = {
    src: targetImage.src,
    naturalWidth: targetImage.naturalWidth,
    naturalHeight: targetImage.naturalHeight,
    crossOrigin: targetImage.crossOrigin,
  };

  // Send message to content script to start cropping
  window.postMessage(
    {
      type: "ACTIVATE_CROPPER",
      imageData: imageData,
    },
    "*"
  );
}

// Handle download requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCropperURL") {
    // Provide the cropper HTML URL to content script
    const cropperURL = chrome.runtime.getURL("cropper.html");
    sendResponse({ url: cropperURL });
    return;
  }

  if (request.action === "download") {
    const filename = `cropped-16x9-${Date.now()}.png`;

    chrome.downloads.download(
      {
        url: request.dataUrl,
        filename: filename,
        saveAs: false, // This prevents the save dialog
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError);
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          console.log("Download started with ID:", downloadId);
          sendResponse({ success: true, downloadId: downloadId });
        }
      }
    );

    return true; // Keep the message channel open for async response
  }
});
