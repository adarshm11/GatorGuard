import { useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string;
  song_length: number;
  link: string;
}

export default function MusicPlayer({ songs = [] }: { songs?: Song[] }) {
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const togglePlay = (songId: string) => {
    if (currentSong === songId && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentSong(songId);
      setIsPlaying(true);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg">
      <div className="p-4 bg-purple-700/80">
        <h2 className="text-xl font-bold text-white">Music for Your Mode</h2>
        <p className="text-purple-100">
          Enhance your experience with these curated tracks
        </p>
      </div>

      <div className="divide-y divide-purple-600/20">
        {songs.map((song,index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 hover:bg-purple-600/20 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={() => togglePlay(song.id)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                {currentSong === song.id && isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <div>
                <h3 className="font-medium text-white"> <a href={song.url}target='_blank' rel="noopener noreferrer"> {song.title}  </a>  </h3>
                <p className="text-sm text-purple-200">{song.artist}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-purple-800/50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            className="text-purple-200 hover:text-white"
            title="Skip Back"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            className="text-purple-200 hover:text-white"
            title="Skip Forward"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Footer player bar */}
        <div className="p-4 bg-purple-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className="text-purple-200 hover:text-white"
              title="Skip Back"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              className="text-purple-200 hover:text-white"
              title="Skip Forward"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-purple-200" />
            <div className="w-24 h-1 bg-purple-600/30 rounded-full">
              <div className="w-1/2 h-full bg-purple-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
