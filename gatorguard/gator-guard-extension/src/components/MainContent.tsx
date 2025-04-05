import React from "react";
import { useBackgroundConnection } from "../hooks/useBackgroundConnection";

const MainContent: React.FC = () => {
  const { authenticated, recentLinks, currentMode, loading, error, setMode } =
    useBackgroundConnection();

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 text-red-500">
        Error: {error}
        <button
          onClick={() => chrome.runtime.reload()}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Reload Extension
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-2">
      <h2 className="text-xl mb-4">GatorGuard Status</h2>

      {/* Authentication Status */}
      <div className="mb-4">
        <p>
          Login Status:
          <span className={authenticated ? "text-green-500" : "text-red-500"}>
            {authenticated ? " Logged In" : " Not Logged In"}
          </span>
        </p>
        {!authenticated && (
          <a
            href="http://localhost:3000/login"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            Go to Login Page
          </a>
        )}
      </div>

      {/* Mode Selector */}
      <div className="mb-4">
        <h3 className="font-semibold">Current Mode: {currentMode}</h3>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setMode("work")}
            className={`px-3 py-1 rounded ${
              currentMode === "work" ? "bg-green-700" : "bg-blue-600"
            }`}
          >
            Work
          </button>
          <button
            onClick={() => setMode("study")}
            className={`px-3 py-1 rounded ${
              currentMode === "study" ? "bg-green-700" : "bg-blue-600"
            }`}
          >
            Study
          </button>
          <button
            onClick={() => setMode("leisure")}
            className={`px-3 py-1 rounded ${
              currentMode === "leisure" ? "bg-green-700" : "bg-blue-600"
            }`}
          >
            Leisure
          </button>
        </div>
      </div>

      {/* Recent Links */}
      <div>
        <h3 className="font-semibold mb-2">Recent Sites Visited</h3>
        {recentLinks.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {recentLinks.map((link, index) => (
              <li
                key={index}
                className="truncate border-b border-gray-700 pb-1"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-400"
                >
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No recent sites tracked</p>
        )}
      </div>
    </div>
  );
};

export default MainContent;
