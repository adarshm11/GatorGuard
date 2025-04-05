import { useState, useEffect } from "react";

export interface BackgroundState {
  authenticated: boolean;
  recentLinks: Array<{ url: string; title: string }>;
  currentMode: string;
}

export const useBackgroundConnection = () => {
  const [backgroundState, setBackgroundState] = useState<BackgroundState>({
    authenticated: false,
    recentLinks: [],
    currentMode: "work",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch all state from background
  const refreshState = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get authentication status
      const authResponse = await chrome.runtime.sendMessage({
        type: "GET_AUTH_STATUS",
      });

      // Get recent links
      const linksResponse = await chrome.runtime.sendMessage({
        type: "GET_RECENT_LINKS",
      });

      // Get current mode
      const modeResponse = await chrome.runtime.sendMessage({
        type: "GET_CURRENT_MODE",
      });

      setBackgroundState({
        authenticated: authResponse.authenticated,
        recentLinks: linksResponse.links,
        currentMode: modeResponse.mode,
      });
    } catch (err) {
      console.error("Failed to connect to background script:", err);
      setError(
        "Failed to connect to extension background. Please reload the extension."
      );
    } finally {
      setLoading(false);
    }
  };

  // Set mode function
  const setMode = async (mode: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SET_MODE",
        mode,
      });

      if (response.success) {
        setBackgroundState((prev) => ({
          ...prev,
          currentMode: response.newMode,
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to set mode:", err);
      return false;
    }
  };

  // Listen for changes from background script
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "BACKGROUND_STATE_UPDATED") {
        setBackgroundState((prevState) => ({
          ...prevState,
          ...message.updates,
        }));
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    // Initial state fetch
    refreshState();

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return {
    ...backgroundState,
    loading,
    error,
    refreshState,
    setMode,
  };
};
