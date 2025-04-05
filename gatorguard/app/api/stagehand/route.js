import { Stagehand } from "@browserbasehq/stagehand";

async function sendTitleToBackend(url, title, timestamp) {
  try {
    console.log("Sending data to Python backend...");
    const backendResponse = await fetch("http://127.0.0.1:8000/received-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        title,
        timestamp,
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

async function sendTextContentToBackend(textContent) {
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

    console.log("Sending data to Python backend...");
    console.log("Text content type:", typeof contentToSend);
    console.log(
      "Text content preview:",
      contentToSend.substring(0, 100) + "..."
    );

    const backendResponse = await fetch(
      "http://127.0.0.1:8000/received-text-content",
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

async function addWebsiteToDB(url, title, timestamp, allowed) {
  try {
    console.log("Sending data to Python backend...");
    const backendResponse = await fetch("http://127.0.0.1:8000/add-website-to-db", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        title,
        timestamp, // ADD MODE LATER
        study_allowed: allowed,
      }),
    });
    // format of backendResponse: 
    /* 
    success: true/false,
    errorMessage?
    */
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log("Python backend response:", data);
      return JSON.stringify({
        success: true
      })
    } else {
      console.warn(`Python backend returned status ${backendResponse.status}`);
      return JSON.stringify({
        success: false,
        errorMessage: backendResponse.errorMessage,
      })
    }
  } catch (backendError) {
    console.warn(
      "Failed to communicate with Python backend:",
      backendError.message,
    );
    return JSON.stringify({
      success: false,
    })
  }
}

export async function POST(req) {
  let stagehand = null;

  try {
    if (!globalThis.__bundlerPathsOverrides) {
      globalThis.__bundlerPathsOverrides = {};
    }
    globalThis.__bundlerPathsOverrides["thread-stream-worker"] =
      "./node_modules/thread-stream/lib/worker.js";

    const { url, title, timestamp } = await req.json();

    // Validate request parameters
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log(`Processing request for URL: ${url}`);
    console.log(`Title: ${title || "Not provided"}`);
    console.log(`Timestamp: ${timestamp}`);

    const titleResult = await sendTitleToBackend(url, title, timestamp);

    if (!titleResult) { // title was already determined to be irrelevant -> short-circuit evaluation
      await addWebsiteToDB(url, title, timestamp, false);
      return new Response(
        JSON.stringify({
          success: true,
          allowed: false,
          url,
          title: title || url,
          timestamp,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check for required API keys
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not defined in your environment variables",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "ANTHROPIC_API_KEY is not defined in your environment variables",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Creating Stagehand instance...");
    stagehand = new Stagehand({
      env: "LOCAL",
      modelName: "gpt-4o-mini",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY,
      },
    });

    console.log("Initializing Stagehand...");
    await stagehand.init();
    console.log("Stagehand initialized successfully");

    const page = stagehand.page;
    console.log(`Navigating to ${url}...`);

    await page.goto(url, {
      timeout: 60000,
    });
    console.log("Page loaded successfully");

    console.log("Creating agent with Claude...");
    const agent = stagehand.agent({
      provider: "anthropic",
      model: "claude-3-7-sonnet-20250219",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const agentQuery = `
        Extract the following and terminate as soon as you can, no need to click around the page:
          - Title
          - Main body text
          - Structured data          
        Ignore ads, sidebars, and footers.
    `;

    console.log("Executing task...");
    const textContent = await agent.execute(agentQuery);
    console.log("Agent execution result:", textContent);

    const textContentResult = await sendTextContentToBackend(textContent);

    const finalAllowed = titleResult && textContentResult;

    const dbResponse = await addWebsiteToDB(url, title, timestamp, finalAllowed);
    /* 
    format of dbResponse:
    success: t/f,
    errorMessage: ?
    */
    
    if (!dbResponse.success) {
      console.log("Error occurred while adding to DB: ", dbResponse.errorMessage);
    }
    
    console.log("Closing Stagehand...");
    await stagehand.close();
    stagehand = null;

    // Return the response with the result
    return new Response(
      JSON.stringify({
        success: true,
        allowed: finalAllowed,
        textContent,
        url,
        title: title || url,
        timestamp,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack trace:", error.stack);

    // Make sure to close the browser if it's open
    if (stagehand) {
      console.log("Closing Stagehand due to error...");
      try {
        await stagehand.close();
      } catch (closeError) {
        console.error("Error closing Stagehand:", closeError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
