// Global authentication state
let isAuthenticated = false;

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
      isAuthenticated = data.authenticated;
      console.log(
        "Authentication status:",
        isAuthenticated ? "Logged in" : "Not logged in"
      );

    })
    .catch((error) => {
      console.error("Auth check failed:", error);
      isAuthenticated = false;
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

    const isLocalhost3000 = urlObj.hostname === "localhost" && urlObj.port === "3000";

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
  fetch("http://localhost:3000/api/stagehand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: url,
      title: title || url,
      timestamp: new Date().toISOString(),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Backend response:", data);
      
      // Handle the allowed status
      if (data.allowed === true) {
        console.log("Website is allowed for studying");
      } else {
        console.log("Website is NOT allowed for studying");        
        // Optional: Show a notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "sf_hacks_sfsu_logo.jpg",
          title: "Study Focus Mode",
          message: "This website isn't ideal for studying. Consider switching to something more productive."
        });
      }
    })
    .catch((error) => console.error("Error:", error));
}
