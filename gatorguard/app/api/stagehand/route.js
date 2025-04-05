import { Stagehand } from "@browserbasehq/stagehand";
import {
  sendTitleToBackend,
  sendTextContentToBackend,
  addWebsiteToDB,
  checkWebsiteInDB,
} from "../utils/backendApi";


export async function POST(req) {
  let stagehand = null;
  let url, title, timestamp, mode;
  let addedToDB = false;

  try {
    if (!globalThis.__bundlerPathsOverrides) {
      globalThis.__bundlerPathsOverrides = {};
    }
    globalThis.__bundlerPathsOverrides["thread-stream-worker"] =
      "./node_modules/thread-stream/lib/worker.js";

    const requestData = await req.json();
    url = requestData.url;
    title = requestData.title;
    timestamp = requestData.timestamp;
    mode = requestData.mode;

    const titleResult = await sendTitleToBackend(url, title, timestamp);

    console.log(`Processing request for URL: ${url}`);
    console.log(`Title: ${title || "Not provided"}`);
    console.log(`Timestamp: ${timestamp}`);

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
    console.log(`Current mode: ${mode}`);

    // Check if website exists in database
    const checkData = await checkWebsiteInDB(url);

    if (checkData.exists) {
      // short circuit evaluation, if website exists in database, return the stored permission
      console.log("Website found in database, returning stored permission");
      return new Response(
        JSON.stringify({
          success: true,
          allowed: checkData[`${mode}_allowed`],
          url,
          title: title || url,
          timestamp,
          fromDatabase: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const titleResult = await sendTitleToBackend(url, title, timestamp, mode);

    if (!titleResult) {
      // title was already determined to be irrelevant -> short-circuit evaluation
      await addWebsiteToDB(url, title, timestamp, false, mode);
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
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not defined in your environment variables",
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

    console.log("Creating Stagehand instance with Gemini...");
    stagehand = new Stagehand({
      env: "LOCAL",
      modelName: "gemini-2.0-flash",
      modelClientOptions: {
        apiKey: process.env.GEMINI_API_KEY,
      },
    });

    console.log("Initializing Stagehand with Gemini...");
    await stagehand.init();
    console.log("Gemini Stagehand initialized successfully");

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
        No need to scroll around the page and terminate as soon as you can. Extract the following from the webpage:
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

    const dbResponse = await addWebsiteToDB(
      url,
      title,
      timestamp,
      finalAllowed,
      mode
    );

    if (!dbResponse.success) {
      console.log(
        "Error occurred while adding to DB:",
        dbResponse.errorMessage
      );
    } else {
      addedToDB = true;
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

    // If we haven't added to DB yet, do it now with a default value (false for safety)
    if (url && !addedToDB) {
      try {
        console.log("Adding website to DB despite Stagehand failure...");
        const dbResponse = await addWebsiteToDB(
          url,
          title,
          timestamp,
          false,
          mode
        );

        if (dbResponse.success) {
          console.log("Successfully added website to DB as fallback");
          addedToDB = true;
        } else {
          console.log(
            "Failed to add website to DB as fallback:",
            dbResponse.errorMessage
          );
        }
      } catch (dbError) {
        console.error("Error adding website to DB as fallback:", dbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        addedToDB: addedToDB, // Let the client know if we added to DB anyway
        allowed: false, // Default to false for safety if Stagehand failed
        url,
        title: title || url,
        timestamp,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
