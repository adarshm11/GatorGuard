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
  const setMode = async (
    mode: string,
    studySubmodeSet = null,
    lyricsStatus = false
  ) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SET_MODE",
        mode,
        study_submode_set: studySubmodeSet,
        lyrics_status: lyricsStatus,
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

  // Add a logout function to your hook
  const logout = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "LOGOUT",
      });

      if (response && response.success) {
        setBackgroundState((prev) => ({
          ...prev,
          authenticated: false,
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to logout:", err);
      return false;
    }
  };

  // Function to sync mode with Supabase
  const syncModeWithDatabase = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SYNC_MODE_WITH_DATABASE",
      });

      if (response && response.success) {
        setBackgroundState((prev) => ({
          ...prev,
          currentMode: response.mode,
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to sync mode with database:", err);
      return false;
    }
  };

  // Listen for changes from background script
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "BACKGROUND_STATE_UPDATED") {
        setBackgroundState((prevState) => ({
          ...prevState,
          ...message.data, // CHANGED: was message.updates before
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

  useEffect(() => {
    // Check auth status when component mounts
    const checkAuthStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "CHECK_AUTH",
        });

        if (response) {
          setBackgroundState((prev) => ({
            ...prev,
            authenticated: response.authenticated,
          }));
        }
      } catch (err) {
        console.error("Failed to check auth status:", err);
      }
    };

    checkAuthStatus();

    // Optionally set up periodic checks
    const interval = setInterval(checkAuthStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    ...backgroundState,
    loading,
    error,
    refreshState,
    setMode,
    logout,
    syncModeWithDatabase,
  };
};
