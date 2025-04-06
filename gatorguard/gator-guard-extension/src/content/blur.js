// Content script to handle blurring of disallowed pages

let blurOverlay = null;
let isPageBlurred = false;

// Function to blur the page
function blurPage(mode) {
  // Remove existing overlay if any
  removeBlur();

  // Create blur overlay
  blurOverlay = document.createElement("div");
  blurOverlay.id = "gator-guard-blur-overlay";
  blurOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    backdrop-filter: blur(8px);
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  `;

  // Create warning message
  const messageContainer = document.createElement("div");
  messageContainer.style.cssText = `
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 500px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
  `;

  // Add logo
  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("images/logo.jpg");
  logo.style.cssText = `
    width: 80px;
    height: 80px;
    margin-bottom: 1rem;
    border-radius: 50%;
  `;
  messageContainer.appendChild(logo);

  // Add title
  const title = document.createElement("h2");
  title.textContent = `${
    mode.charAt(0).toUpperCase() + mode.slice(1)
  } Focus Mode`;
  title.style.cssText = `
    margin: 0 0 1rem 0;
    color: #6b46c1;
    font-size: 1.5rem;
  `;
  messageContainer.appendChild(title);

  // Add message
  const message = document.createElement("p");
  message.textContent = `This website isn't ideal for ${mode} mode. Consider switching to something more productive.`;
  message.style.cssText = `
    margin: 0 0 1.5rem 0;
    color: #4a5568;
  `;
  messageContainer.appendChild(message);

  // Add continue button
  const continueButton = document.createElement("button");
  continueButton.textContent = "Continue Anyway";
  continueButton.style.cssText = `
    background-color: #ecc94b;
    color: #744210;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-right: 0.5rem;
  `;
  continueButton.addEventListener("click", removeBlur);
  messageContainer.appendChild(continueButton);

  // Add close site button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close This Site";
  closeButton.style.cssText = `
    background-color: #6b46c1;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-left: 0.5rem;
  `;
  closeButton.addEventListener("click", () => {
    // Send message to background to close this tab
    chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" });
  });
  messageContainer.appendChild(closeButton);

  blurOverlay.appendChild(messageContainer);
  document.body.appendChild(blurOverlay);
  isPageBlurred = true;
}

// Function to remove blur
function removeBlur() {
  if (blurOverlay && blurOverlay.parentNode) {
    blurOverlay.parentNode.removeChild(blurOverlay);
    isPageBlurred = false;
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "BLUR_PAGE") {
    blurPage(message.mode);
    sendResponse({ success: true });
  } else if (message.type === "REMOVE_BLUR") {
    removeBlur();
    sendResponse({ success: true });
  } else if (message.type === "IS_PAGE_BLURRED") {
    sendResponse({ blurred: isPageBlurred });
  }
  return true;
});

// Check if this page should be blurred on load
chrome.runtime.sendMessage({ type: "CHECK_SHOULD_BLUR" }, (response) => {
  if (response && response.shouldBlur) {
    blurPage(response.mode);
  }
});
