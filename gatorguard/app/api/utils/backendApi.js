/**
 * Backend API utilities for communicating with the Python backend
 */

const BACKEND_BASE_URL = "http://127.0.0.1:8000";

/**
 * Sends webpage title information to the backend for analysis
 */
export async function sendTitleToBackend(url, title, timestamp, mode) {
  try {
    console.log("Sending title data to Python backend...");
    const backendResponse = await fetch(`${BACKEND_BASE_URL}/received-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        title,
        timestamp,
        mode,
      }),
    });

    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log("Python backend response:", data);
      return data?.allowed === true;
    } else {
      console.warn(`Python backend returned status ${backendResponse.status}`);
      return false;
    }
  } catch (backendError) {
    console.warn(
      "Failed to communicate with Python backend:",
      backendError.message
    );
    return false;
  }
}

/**
 * Sends extracted text content to the backend for further analysis
 */
export async function sendTextContentToBackend(textContent) {
  try {
    // Extract the message text if textContent is an object with a message property
    let contentToSend = textContent;

    if (typeof textContent === "object" && textContent !== null) {
      if (textContent.message) {
        contentToSend = textContent.message;
      } else {
        // Convert the object to a formatted string if there's no message property
        contentToSend = JSON.stringify(textContent, null, 2);
      }
    }

    console.log("Sending text content to Python backend...");
    console.log("Text content type:", typeof contentToSend);
    console.log(
      "Text content preview:",
      contentToSend.substring(0, 100) + "..."
    );

    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/received-text-content`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text_content: contentToSend,
        }),
      }
    );

    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log("Python backend response:", data);
      return data?.allowed === true;
    } else {
      console.warn(`Python backend returned status ${backendResponse.status}`);
      try {
        const errorText = await backendResponse.text();
        console.warn("Error details:", errorText);
      } catch (e) {
        console.warn("Could not read error details", e);
      }
      return false;
    }
  } catch (backendError) {
    console.warn(
      "Failed to communicate with Python backend:",
      backendError.message
    );
    return false;
  }
}

/**
 * Adds a website to the database with the given permission settings
 */
export async function addWebsiteToDB(url, title, timestamp, allowed, mode) {
  try {
    console.log(
      `Adding website to database with ${mode}_allowed: ${allowed}...`
    );

    // Create the request body with the specific permission for the current mode
    const requestBody = {
      url,
      title: title || url,
      timestamp,
    };

    if (mode === "study") {
      requestBody.study_allowed = allowed;
      requestBody.work_allowed = null;
      requestBody.leisure_allowed = null;
    } else if (mode === "work") {
      requestBody.study_allowed = null;
      requestBody.work_allowed = allowed;
      requestBody.leisure_allowed = null;
    } else if (mode === "leisure") {
      requestBody.study_allowed = null;
      requestBody.work_allowed = null;
      requestBody.leisure_allowed = allowed;
    }

    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/add-website-to-db`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log("Database response:", data);
      return data; // Return the parsed JSON directly
    } else {
      console.warn(`Database returned status ${backendResponse.status}`);
      const errorData = await backendResponse.json().catch(() => ({}));
      return {
        success: false,
        errorMessage:
          errorData.errorMessage || `Server returned ${backendResponse.status}`,
      };
    }
  } catch (backendError) {
    console.warn("Failed to communicate with database:", backendError.message);
    return {
      success: false,
      errorMessage: backendError.message,
    };
  }
}

/**
 * Checks if a website exists in the database and retrieves its permissions
 */
export async function checkWebsiteInDB(url) {
  try {
    console.log("Checking if website exists in database...");
    const checkResponse = await fetch(
      `${BACKEND_BASE_URL}/check-website-exists`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      }
    );

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log("Database check response:", checkData);
      return checkData;
    }
    return { exists: false };
  } catch (dbError) {
    console.warn("Error checking database:", dbError.message);
    return { exists: false, error: dbError.message };
  }
}
