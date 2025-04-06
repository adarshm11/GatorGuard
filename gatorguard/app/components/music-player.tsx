
import { useState } from "react"
import { Play, Pause, SkipForward, SkipBack, Volume2,Music2 } from "lucide-react"

interface Song {
  id: string
  title: string
  artist: string
  song_length: number
  link:string 
}

export default function MusicPlayer({songs}:{songs:Song[]}) {
  const [currentSong, setCurrentSong] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showLyrics,setShowLyrics]=useState(false)

  const togglePlay = (songId: string) => {
    if (currentSong === songId && isPlaying) {
      setIsPlaying(false)
    } else {
      setCurrentSong(songId)
      setIsPlaying(true)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg">
      <div>
        {/* Header */}
        <div className="p-4 bg-purple-700/80">
          <h2 className="text-xl font-bold text-white">Music for Your Mode</h2>
          <div className="flex items-center space-x-2 mt-2">

            <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-purple-200">Lyrics</span>
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 ease-in-out ${showLyrics ? "bg-gradient-to-r from-green-500 to-green-400" : "bg-purple-900"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${showLyrics ? "translate-x-5" : "translate-x-0"}`}
              ></span>
            </button>

          </div>
          </div>
          <p className="text-purple-100 mt-2">Enhance your experience with these curated tracks</p>
        </div>
  
        {/* Song list */}
        <div className="divide-y divide-purple-600/20">
          {songs.map((song) => (
            <div
              key={song.id}
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
                  <h3 className="font-medium text-white">{song.title}</h3>
                  <p className="text-sm text-purple-200">{song.artist}</p>
                </div>
              </div>
              <span className="text-purple-200">{song.song_length}</span>
            </div>
          ))}
        </div>
  
        {/* Footer player bar */}
        <div className="p-4 bg-purple-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="text-purple-200 hover:text-white" title="Skip Back">
              <SkipBack className="w-5 h-5" />
            </button>
            <button className="text-purple-200 hover:text-white" title="Skip Forward">
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

