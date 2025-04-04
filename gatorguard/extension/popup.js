document.addEventListener("DOMContentLoaded", function () {
  // Check authentication status
  checkAuthAndUpdateUI();

  // Load current tab info regardless of auth status
  loadCurrentTabInfo();

  // Simple refresh button
  document
    .getElementById("refreshButton")
    .addEventListener("click", function () {
      location.reload();
    });

  // Login button event listener
  document
    .getElementById("loginButton")
    ?.addEventListener("click", function () {
      chrome.tabs.create({ url: "http://localhost:3000/login" });
    });
});

function loadCurrentTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      document.getElementById("currentTitle").textContent =
        tabs[0].title || "No title";
      document.getElementById("currentUrl").textContent =
        tabs[0].url || "No URL";
    }
  });

  chrome.storage.local.get(["recentLinks"], function (result) {
    const recentLinks = result.recentLinks || [];
    const linksList = document.getElementById("recentLinksList");

    linksList.innerHTML =
      recentLinks.length === 0
        ? "<li>No recent links found</li>"
        : recentLinks
            .map(
              (link) =>
                `<li><a href="${link.url}" target="_blank">${link.title}</a></li>`
            )
            .join("");
  });
}

function checkAuthAndUpdateUI() {
  fetch("http://localhost:3000/api/checkauth", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.authenticated) {
        showAuthenticatedUI(data.user);
      } else {
        showUnauthenticatedUI();
      }
    })
    .catch((error) => {
      console.error("Auth check failed:", error);
      showUnauthenticatedUI();
    });
}

function showAuthenticatedUI(user) {
  // Display authenticated content
  document.getElementById("auth-status").innerHTML = `
    <div class="user-info">
      <p>Logged in as: <strong>${user.username || user.email}</strong></p>
    </div>
  `;

  // Show main content and hide login prompt
  document.getElementById("main-content").style.display = "block";
  document.getElementById("login-prompt").style.display = "none";

  // Ensure recent links are visible
  document.querySelector(".recent-links").style.display = "block";

  // Remove unauthenticated class if it exists
  document.getElementById("main-content").classList.remove("unauthenticated");
}

function showUnauthenticatedUI() {
  document.getElementById("auth-status").innerHTML = `
    <p>You are not logged in</p>
  `;

  // Show login prompt
  document.getElementById("login-prompt").style.display = "block";

  // Add unauthenticated class to main content
  document.getElementById("main-content").classList.add("unauthenticated");

  // Hide the recent links section completely
  document.querySelector(".recent-links").style.display = "none";
}
