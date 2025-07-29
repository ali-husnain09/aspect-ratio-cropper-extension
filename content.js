window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ACTIVATE_CROPPER") {
    injectCropTools(event.data.src);
  }
  if (event.data && event.data.type === "CLOSE_CROPPER") {
    const iframe = document.getElementById("cropper-frame");
    if (iframe) iframe.remove();
  }
});

function injectCropTools(imageSrc) {
  // Only add button if not already present
  if (document.getElementById("crop-image-btn")) return;
  const cropBtn = document.createElement("button");
  cropBtn.id = "crop-image-btn";
  cropBtn.innerText = "Crop Image";
  cropBtn.style.position = "fixed";
  cropBtn.style.bottom = "20px";
  cropBtn.style.right = "20px";
  cropBtn.style.zIndex = 99999;
  cropBtn.style.padding = "10px 15px";
  cropBtn.style.fontSize = "16px";
  cropBtn.style.border = "none";
  cropBtn.style.background = "#007bff";
  cropBtn.style.color = "#fff";
  cropBtn.style.cursor = "pointer";
  cropBtn.style.borderRadius = "5px";

  cropBtn.onclick = () => openCropper(imageSrc);
  document.body.appendChild(cropBtn);
}

function openCropper(imageSrc) {
  if (document.getElementById("cropper-frame")) return;
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("cropper.html");
  iframe.style.position = "fixed";
  iframe.style.top = 0;
  iframe.style.left = 0;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.zIndex = 999999;
  iframe.style.border = "none";
  iframe.id = "cropper-frame";
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow.postMessage(
      { type: "START_CROPPER", src: imageSrc },
      "*"
    );
  };
}
