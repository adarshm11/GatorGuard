"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { createClient } from "./utils/supabase/client";
import {
  BookOpen,
  Briefcase,
  Coffee,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

type ModeValue = "study" | "work" | "leisure" | null;
type SubmodeValue = "interview" | "school" | null;

type Mode = {
  label: string;
  value: ModeValue;
  icon: React.ReactNode;
  color: string;
  submodes?: { label: string; value: SubmodeValue; icon: React.ReactNode }[];
};

const modes: Mode[] = [
  {
    label: "Study Mode",
    value: "study",
    icon: <BookOpen className="h-6 w-6" />,
    color: "from-purple-500 to-indigo-600",
    submodes: [
      {
        label: "Interview Prep",
        value: "interview",
        icon: <Sparkles className="h-5 w-5" />,
      },
      {
        label: "School Work",
        value: "school",
        icon: <BookOpen className="h-5 w-5" />,
      },
    ],
  },
  {
    label: "Work Mode",
    value: "work",
    icon: <Briefcase className="h-6 w-6" />,
    color: "from-emerald-500 to-teal-600",
  },
  {
    label: "Leisure Mode",
    value: "leisure",
    icon: <Coffee className="h-6 w-6" />,
    color: "from-yellow-400 to-orange-400",
  },
];

export default function Home() {
  const [activeMode, setActiveMode] = useState<ModeValue>(null);
  const [submode, setSubmode] = useState<SubmodeValue>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetActiveMode = (mode: ModeValue) => {
    setActiveMode(mode);
    setSubmode(null);
  };

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        console.log("User does not exist");
      } else {
        setUserId(data.user.id);
      }
    }

    getUser();
  }, []);

  const handleSubmitClick = async () => {
    console.log(`You selected ${activeMode}${submode ? ": " + submode : ""}`);
    setIsLoading(true);

    if (!userId) {
      console.warn("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/received-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          mode: activeMode,
          submode: submode,
        }),
      });

      if (response.ok) {
        console.log("Mode data saved successfully");
      }
    } catch (error) {
      console.warn("Error: post request failed" + error);
    }

    setIsLoading(false);

    const urlParams = new URLSearchParams();
    urlParams.set("mode", activeMode || "");
    if (submode) {
      urlParams.set("submode", submode);
    }

    window.location.href = `/player?${urlParams.toString()}`;
  };

  const activeModeObj = modes.find((m) => m.value === activeMode);

  return (
    <div className="flex justify-center w-full min-h-screen">
      <main className="flex flex-col items-center justify-start w-full max-w-md p-6">
        <div className="relative mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-white">
            GatorGuard
          </h1>
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-emerald-500 rounded-full opacity-50 animate-pulse"></div>
          <div className="absolute -bottom-2 -left-4 w-6 h-6 bg-teal-400 rounded-full opacity-50 animate-pulse delay-700"></div>
        </div>

        <h3 className="text-lg text-center mb-10 text-gray-100 font-medium">
          Block out distractions, focus on what you do.
        </h3>

        <div className="w-full mb-8 relative">
          <h2 className="text-xl mb-6 font-semibold text-center">
            Select Your Gator Mode:
          </h2>
          <div className="grid grid-cols-3 gap-4 w-full">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleSetActiveMode(mode.value)}
                className={`
                  relative overflow-hidden rounded-xl shadow-md transition-all duration-300 ease-out
                  ${
                    activeMode === mode.value
                      ? `bg-gradient-to-br ${mode.color} text-white scale-105 shadow-lg`
                      : "bg-white hover:scale-105 hover:shadow-md"
                  }
                `}
              >
                <div className="flex flex-col items-center justify-center p-4 h-full">
                  <div
                    className={`mb-2 ${
                      activeMode === mode.value
                        ? "text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {mode.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      activeMode === mode.value
                        ? "text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {mode.label}
                  </span>
                </div>
                {activeMode === mode.value && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white opacity-20 rounded-full animate-ping"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeModeObj?.submodes && (
          <div className="w-full mb-8 bg-white p-5 rounded-xl shadow-sm">
            <h3 className="text-lg font-medium mb-4 text-slate-700">
              Choose a specific focus:
            </h3>
            <div className="space-y-3">
              {activeModeObj.submodes.map((sub) => (
                <label
                  key={sub.value}
                  className={`
                    flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all duration-200
                    ${
                      submode === sub.value
                        ? "bg-gradient-to-r from-purple-100 to-indigo-100 shadow-sm"
                        : "hover:bg-slate-50"
                    }
                  `}
                >
                  <div className="relative">
                    <input
                      type="radio"
                      name="submode"
                      value={sub.value ?? ""}
                      checked={submode === sub.value}
                      onChange={() =>
                        setSubmode(submode === sub.value ? null : sub.value)
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${
                        submode === sub.value
                          ? "border-purple-500 bg-purple-500"
                          : "border-slate-300"
                      }`}
                    >
                      {submode === sub.value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-full ${
                        submode === sub.value ? "bg-purple-200" : "bg-slate-100"
                      }`}
                    >
                      {sub.icon}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {sub.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeMode && (
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleSubmitClick}
              disabled={isLoading}
              className={`
                relative overflow-hidden py-3 rounded-lg font-medium text-white shadow-md
                transition-all duration-300 ease-out
                ${
                  isLoading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-teal-600 hover:shadow-lg hover:translate-y-[-2px]"
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Let&apos;s Go!</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </div>
              {!isLoading && (
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10 transform -translate-x-full animate-shimmer"></div>
              )}
            </button>

            <button
              onClick={() => {
                setActiveMode(null);
                setSubmode(null);
              }}
              className="py-2 rounded-lg font-medium text-slate-600 bg-white hover:bg-slate-100 hover:shadow-lg hover:translate-y-[-2px] animate-shimmer"
            >
              Reset
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
