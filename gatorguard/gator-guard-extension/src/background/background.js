// Global authentication state
let isAuthenticated = false;

// Global variable to store current mode
let currentMode = "work"; // Default to work mode

// In background.js initialization
chrome.storage.local.get("currentMode", (result) => {
  if (result.currentMode) {
    currentMode = result.currentMode;
    console.log(`Loaded saved mode: ${currentMode}`);
  }
});

// Check authentication status periodically
function checkAuthentication() {
  fetch("http://localhost:3000/api/checkauth", {
    method: "GET",
    credentials: "include", // Important for cookies
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Store the previous state before updating
      const wasAuthenticated = isAuthenticated;
      isAuthenticated = data.authenticated;

      console.log(
        "Authentication status:",
        isAuthenticated ? "Logged in" : "Not logged in"
      );

      // If authentication status changed, broadcast to all extension pages
      if (wasAuthenticated !== isAuthenticated) {
        chrome.runtime.sendMessage({
          type: "BACKGROUND_STATE_UPDATED",
          data: { authenticated: isAuthenticated },
        });
      }
    })
    .catch((error) => {
      console.error("Auth check failed:", error);
      isAuthenticated = false;

      // Also broadcast on error (assume logged out)
      chrome.runtime.sendMessage({
        type: "BACKGROUND_STATE_UPDATED",
        data: { authenticated: false },
      });
    });
}

// Check auth on extension start and every 5 minutes
checkAuthentication();
setInterval(checkAuthentication, 5 * 60 * 1000);

function processTab(tab) {
  try {
    // Parse URL first to handle invalid URLs
    let urlObj;
    try {
      urlObj = new URL(tab.url);
    } catch (e) {
      console.log("Invalid URL:", tab.url, e);
      return;
    }

    // More detailed logging to diagnose the issue
    console.log(`Processing potential tab: ${tab.url}`);
    console.log(`Hostname: ${urlObj.hostname}`);

    const isLocalhost3000 =
      urlObj.hostname === "localhost" && urlObj.port === "3000";

    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url === "about:blank" ||
      isLocalhost3000
    ) {
      console.log(`Skipping URL: ${tab.url}`);
      return;
    }

    console.log(`Processing URL: ${tab.url}`);

    // Store in local storage
    storeLink(tab.url, tab.title);

    // Send to backend
    sendLinkToJSBackend(tab.url, tab.title);
  } catch (e) {
    console.error("Error processing tab:", e);
  }
}

// Track tab activations
chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    processTab(tab);
  });
});

// Track URL changes within tabs
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    setTimeout(() => processTab(tab), 500); // Small delay
  }
});

// Store recent links
function storeLink(url, title) {
  chrome.storage.local.get(["recentLinks"], function (result) {
    let links = result.recentLinks || [];

    // Remove if exists
    links = links.filter((link) => link.url !== url);

    // Add to beginning
    links.unshift({
      url: url,
      title: title || url,
    });

    // Keep only 10 most recent
    links = links.slice(0, 10);

    // Save to storage
    chrome.storage.local.set({ recentLinks: links });
  });
}

// Send to backend and handle response
function sendLinkToJSBackend(url, title) {
  // Use the global currentMode variable instead of hardcoding it
  fetch("http://localhost:3000/api/stagehand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: url,
      title: title || url,
      timestamp: new Date().toISOString(),
      mode: currentMode,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Backend response:", data);

      // Handle the allowed status
      if (data.allowed === true) {
        console.log(`Website is allowed for ${currentMode} mode`);
      } else {
        console.log(`Website is NOT allowed for ${currentMode} mode`);
        // Show a notification with the current mode
        chrome.notifications.create({
          type: "basic",
          // Use chrome.runtime.getURL to get the absolute path to your extension's resources
          iconUrl: chrome.runtime.getURL("images/logo.jpg"),
          title: `${
            currentMode.charAt(0).toUpperCase() + currentMode.slice(1)
          } Focus Mode`,
          message: `This website isn't ideal for ${currentMode} mode. Consider switching to something more productive.`,
        });
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Function to recheck current tab with new mode
function recheckCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0];

      // Skip if no URL or if it's a special URL
      if (!currentTab.url) return;

      // Parse URL to check for localhost:3000
      let urlObj;
      try {
        urlObj = new URL(currentTab.url);

        // Skip chrome:// URLs and localhost:3000
        const isLocalhost3000 =
          urlObj.hostname === "localhost" && urlObj.port === "3000";

        if (
          currentTab.url.startsWith("chrome://") ||
          currentTab.url === "about:blank" ||
          isLocalhost3000
        ) {
          console.log(`Skipping URL during recheck: ${currentTab.url}`);
          return;
        }

        // Process the tab if it passes all checks
        sendLinkToJSBackend(currentTab.url, currentTab.title);
      } catch (e) {
        console.log("Invalid URL during recheck:", currentTab.url, e);
        return;
      }
    }
  });
}

// Listen for messages from React components and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  // Handle different message types
  switch (message.type) {
    case "GET_AUTH_STATUS":
      sendResponse({ authenticated: isAuthenticated });
      break;

    case "GET_RECENT_LINKS":
      chrome.storage.local.get(["recentLinks"], function (result) {
        sendResponse({ links: result.recentLinks || [] });
      });
      return true; // Keep message channel open for async response

    case "GET_CURRENT_MODE":
      sendResponse({ mode: currentMode }); // Replace with your mode logic
      break;

    case "SET_MODE":
      // Update the mode
      const oldMode = currentMode;
      currentMode = message.mode;

      // Respond with success
      sendResponse({
        success: true,
        newMode: currentMode,
      });

      // Store the mode in chrome.storage for persistence
      chrome.storage.local.set({ currentMode: currentMode });

      // If mode changed, recheck current tab
      if (oldMode !== currentMode) {
        recheckCurrentTab();
      }

      // Broadcast the change to any open extension pages
      chrome.runtime.sendMessage({
        type: "BACKGROUND_STATE_UPDATED",
        data: {
          currentMode: currentMode,
        },
      });

      return true; // Required to use sendResponse asynchronously

    case "GET_MODE":
      sendResponse({
        mode: currentMode,
      });
      return true;

    default:
      sendResponse({ error: "Unknown message type" });
  }
});

// Fix the logout handler - change "authenticated" to "isAuthenticated"
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle logout
  if (message.type === "LOGOUT") {
    // Clear any auth tokens or state
    isAuthenticated = false; // CHANGED: was "authenticated" before
    chrome.storage.local.remove("authToken");

    // Notify all extension pages
    chrome.runtime.sendMessage({
      type: "BACKGROUND_STATE_UPDATED",
      data: { authenticated: false },
    });

    sendResponse({ success: true });
    return true;
  }

  // Handle authentication check
  if (message.type === "CHECK_AUTH") {
    // Add logic to verify if the user is still logged in
    checkAuthentication(); // Actually perform a fresh check
    sendResponse({ authenticated: isAuthenticated });
    return true;
  }
});

// Send a message when background script initializes to verify it's running
chrome.runtime
  .sendMessage({
    type: "BACKGROUND_INITIALIZED",
    timestamp: new Date().toISOString(),
  })
  .catch((err) => console.log("No listeners registered yet"));
