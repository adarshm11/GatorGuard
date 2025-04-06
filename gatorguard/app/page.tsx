"use client";

import { useState, useEffect } from "react";
import MusicPlayer from "./components/music-player";
import { createClient } from "./utils/supabase/client";


type ModeValue = "study" | "work" | "leisure" | null;
type SubmodeValue = "interview" | "school" | null;

type Mode = {
  label: string;
  value: ModeValue;
  submodes?: { label: string; value: SubmodeValue }[];
};

const modes: Mode[] = [
  {
    label: "Study Mode",
    value: "study",
    submodes: [
      { label: "Interview Prep", value: "interview" },
      { label: "School Work", value: "school" },
    ],
  },
  {
    label: "Work Mode",
    value: "work",
  },
  {
    label: "Leisure Mode",
    value: "leisure",
  },
];

export default function Home() {
  const [activeMode, setActiveMode] = useState<ModeValue>(null);
  const [submode, setSubmode] = useState<SubmodeValue>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generateSongs,setGenerateSongs]=useState([]);

  const handleSetActiveMode = (mode: ModeValue) => {
    setActiveMode(mode);
    setSubmode(null);
    setIsSubmitted(false)
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
  

  useEffect(() => {
    console.log(activeMode);
  }, [activeMode]);

  

  const handleSubmitClick = async () => {
    console.log(`You selected ${activeMode}${submode ? ": " + submode : ""}`);
    setIsSubmitted(true);
    if (!userId) {
      console.warn("User not authenticated");
      // You might want to redirect to login page or show a message
      return;
    }

    try{
      const response=await fetch('http://localhost:8000/generate-songs',{
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          mode_select:activeMode,
          sub_mode_select:submode,
          lyrics:true // For now
        })
      })

      if(response.ok){
        console.log("Response received!")
        const data=await response.json()
        setGenerateSongs(data)
        console.log(data)
      }
      else{
        console.log("Unable to connect to the backend api route")
        console.log("Error: "+response.statusText)

      }
    }catch(error){
      console.log("Error with fetching songs")
      console.warn("Error: "+error)
    }

    
    

    // send to API with userId
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
        console.log("Response received!");
        const data = await response.json();
        console.log(data);
      }
    } catch (error) {
      console.warn("Error: post request failed" + error);
    }
  };



  const activeModeObj = modes.find((m) => m.value === activeMode);

  return (
    <div className="flex justify-center w-full">
      <main className="flex flex-col items-center justify-start w-[400px] min-h-[500px] p-6">
        <h1 className="mb-4 text-4xl font-bold">GatorGuard</h1>
        <h3 className="text-lg text-center mb-8">
          Enhancing productivity, prioritizing mental health
        </h3>
        <h2 className="text-xl mb-8">Select Your Gator Mode:</h2>
        <div className="flex flex-row gap-4 w-full mb-6">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSetActiveMode(mode.value)}
              className={`flex-1 py-2 rounded cursor-pointer 
                hover:bg-black hover:text-white transition-colors duration-500 ease-in-out
                ${
                  activeMode === mode.value
                    ? "bg-black text-white"
                    : "bg-gray-200"
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {activeModeObj?.submodes && (
          <div className="w-full mb-6 flex flex-col gap-2 justify-center items-center">
            {activeModeObj.submodes.map((sub) => (
              <label
                key={sub.value}
                className="flex items-center gap-2 cursor-pointer p-2 rounded"
              >
                <input
                  type="radio"
                  name="submode"
                  value={sub.value ?? ""}
                  checked={submode === sub.value}
                  onChange={() =>
                    setSubmode(submode === sub.value ? null : sub.value)
                  }
                  className="accent-black"
                />
                <span className="flex items-center gap-2 text-sm font-medium">
                  {sub.value === "interview" ? (
                    <span>🎓</span>
                  ) : (
                    <span>🏫</span>
                  )}
                  {sub.label}
                </span>
              </label>
            ))}
          </div>
        )}        
        {activeMode && (
          <div className="flex flex-row">
            <button
              onClick={() => handleSubmitClick()}
              className="mt-4 px-4 py-2 mx-2 cursor-pointer bg-blue-500 text-white rounded hover:bg-blue-800 transition-colors duration-500 ease-in-out"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setActiveMode(null);
                setSubmode(null);
                setIsSubmitted(false) // Reset submission state
              }}
              className="mt-4 px-4 py-2 mx-2 cursor-pointer bg-red-500 text-white rounded hover:bg-red-800 transition-colors duration-500 ease-in-out"
            >
              Reset
            </button>
          </div>
        )}
        {/* Music Player - only shown after submission */}
        {isSubmitted && activeMode && <MusicPlayer songs={generateSongs} />}
      </main>
    </div>
  );
}
