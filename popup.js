document.getElementById("startCrop").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const img = document.querySelector("img");
        if (img) {
          window.postMessage(
            {
              type: "ACTIVATE_CROPPER",
              src: img.src,
            },
            "*"
          );
        } else {
          alert("No image found!");
        }
      },
    });
  });
});
