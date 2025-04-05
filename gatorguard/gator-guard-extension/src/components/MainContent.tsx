import React, { useEffect } from "react";
import { useBackgroundConnection } from "../hooks/useBackgroundConnection";

const MainContent: React.FC = () => {
  const {
    authenticated,
    recentLinks,
    currentMode,
    loading,
    error,
    setMode,
    syncModeWithDatabase,
  } = useBackgroundConnection();

  // Sync mode with database when component mounts or authentication status changes
  useEffect(() => {
    if (authenticated) {
      syncModeWithDatabase();
    }
  }, [authenticated, syncModeWithDatabase]);

  const handleModeChange = async (newMode: string) => {
    // Just pass the mode without the study_submode_set since it's not available in the popup
    const success = await setMode(newMode);
    if (success) {
      console.log(`Mode successfully changed to ${newMode}`);
      // After changing mode, sync with database to confirm changes
      await syncModeWithDatabase();
    } else {
      console.error("Failed to change mode");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        <p>Error: {error}</p>
        <button
          onClick={() => chrome.runtime.reload()}
          className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-all duration-200"
        >
          Reload Extension
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 bg-gradient-to-br from-purple-50 to-yellow-50">
      <h2 className="text-2xl font-bold mb-6 text-purple-800 border-b-2 border-yellow-400 pb-2">
        GatorGuard Dashboard
      </h2>

      {/* Authentication Status */}
      <div className="mb-6 p-3 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-purple-900">Login Status:</span>
          <span
            className={`px-2 py-1 rounded-full text-sm font-medium ${
              authenticated
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {authenticated ? "Logged In" : "Not Logged In"}
          </span>
        </div>
        {!authenticated && (
          <a
            href="http://localhost:3000/login"
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-center bg-yellow-400 hover:bg-yellow-500 text-purple-900 px-4 py-2 rounded-md transition-all duration-200 font-medium"
          >
            Login to GatorGuard
          </a>
        )}
      </div>

      {/* Mode Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
        <h3 className="font-semibold text-purple-800 mb-3">Focus Mode</h3>
        <div className="bg-purple-100 p-2 rounded-lg mb-4">
          <div className="text-center font-medium text-purple-900">
            Currently in:{" "}
            <span className="text-purple-600">
              {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
            </span>{" "}
            Mode
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleModeChange("work")}
            className={`py-2 rounded-md transition-all duration-200 font-medium ${
              currentMode === "work"
                ? "bg-purple-600 text-white"
                : "bg-yellow-300 text-purple-900 hover:bg-yellow-400"
            }`}
          >
            Work
          </button>
          <button
            onClick={() => handleModeChange("study")}
            className={`py-2 rounded-md transition-all duration-200 font-medium ${
              currentMode === "study"
                ? "bg-purple-600 text-white"
                : "bg-yellow-300 text-purple-900 hover:bg-yellow-400"
            }`}
          >
            Study
          </button>
          <button
            onClick={() => handleModeChange("leisure")}
            className={`py-2 rounded-md transition-all duration-200 font-medium ${
              currentMode === "leisure"
                ? "bg-purple-600 text-white"
                : "bg-yellow-300 text-purple-900 hover:bg-yellow-400"
            }`}
          >
            Leisure
          </button>
        </div>
      </div>

      {/* Recent Links */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-purple-800 mb-3 border-b border-yellow-300 pb-2">
          Recent Activity
        </h3>
        {recentLinks.length > 0 ? (
          <ul className="space-y-3">
            {recentLinks.map((link, index) => (
              <li
                key={index}
                className="p-2 hover:bg-purple-50 rounded transition-colors duration-150"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-purple-900 hover:text-purple-600"
                >
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="truncate">{link.title}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>No recent sites tracked</p>
            <p className="text-sm mt-1 text-purple-400">
              Sites will appear here as you browse
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;
