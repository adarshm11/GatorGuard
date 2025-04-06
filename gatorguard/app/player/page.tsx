"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MusicPlayer from "../components/music-player";
import { ArrowLeft } from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string;
  song_length: number;
  link:string;
}

export default function Player() {
  const [generateSongs, setGenerateSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode");
  const submode = searchParams.get("submode");

  useEffect(() => {
    // Fetch songs based on URL params
    async function fetchSongs() {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:8000/generate-songs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode_select: mode,
            sub_mode_select: submode || null,
            lyrics: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setGenerateSongs(data);
        } else {
          console.log("Unable to connect to the backend api route");
        }
      } catch (error) {
        console.log("Error with fetching songs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (mode) {
      fetchSongs();
    } else {
      // No mode selected, redirect to home
      router.push("/");
    }
  }, [mode, submode, router]);

  return (
    <div className="flex justify-center w-full min-h-screen">
      <main className="flex flex-col items-center justify-start w-full max-w-md p-6">
        <div className="w-full mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to modes</span>
          </button>

          <div className="relative mb-8">
            <h1 className="text-4xl font-bold text-transparent text-center bg-clip-text bg-gradient-to-r from-yellow-400 to-white pb-1">
              Gator Mix
            </h1>
            {/* <div className="absolute -top-4 -right-4 w-8 h-8 bg-emerald-500 rounded-full opacity-50 animate-pulse"></div> */}
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg mb-2">
            <h2 className="text-xl text-center font-medium text-white">
              {mode
                ? `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`
                : "Mode"}
              {submode && submode
                ? `: ${submode.charAt(0).toUpperCase() + submode.slice(1)}`
                : ""}
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="w-full flex flex-col items-center justify-center py-6">
            <div className="w-12 h-12 border-4 border-t-teal-500 border-white/30 rounded-full animate-spin"></div>
            <p className="mt-4 text-white">
              Loading your personalized playlist...
            </p>
          </div>
        ) : (
          <div className="w-full animate-fadeIn">
            <MusicPlayer songs={generateSongs} />
          </div>
        )}
      </main>
    </div>
  );
}
