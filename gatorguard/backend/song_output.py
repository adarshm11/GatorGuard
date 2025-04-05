from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from typing import List
from enum import Enum
from fastapi import APIRouter
from supabase import create_client
from utils.spotify_helper import search_spotify_song
from supabase_client import check_if_exists, retrieve_permission, add_website_to_db, SUPABASE_KEY, SUPABASE_URL, add_user_mode,update_user_mode
import google.generativeai as genai
import traceback

from dotenv import load_dotenv
import os

router = APIRouter()
load_dotenv()

class UserMode(BaseModel):
    #user_id:str
    mode_select:str
    sub_mode_select:Optional[str]=None
    lyric_status:Optional[bool]=True

class SongInfo(BaseModel):
    url:str
    title:str
    artist:str
    #album:str // we can add this latter if needed
    song_length:Optional[float]=None

class SongResponse(BaseModel):
    all_songs:List[SongInfo]

@router.get("/testing")
def test():
    return {"message": "Hello World"}

@router.post("/generate-songs")
def process_song_link(mode_status:UserMode):
    print(f"{mode_status.mode_select}: {mode_status.sub_mode_select}: {mode_status.lyric_status}")

    if not(mode_status.mode_select):
        raise HTTPException(status_code=400, detail="Mode selection is required")
    try:
        GENAI_API_KEY=os.getenv("GEMINI_API_KEY_2")
        if not(GENAI_API_KEY):
            raise Exception("No API key found")
        
        if(mode_status.mode_select =='study' and mode_status.sub_mode_select):
            query=f"""
            Recommend 5 songs related to {mode_status.mode_select} with a focus on concentration for {mode_status.sub_mode_select}.
            Only include songs with {mode_status.lyric_status}
            Generate me a new response, don't repeat the previous songs.: 
            Title - Artist - length of song - Spotify Link
            """
            if mode_status.lyric_status:
                query += "\nSongs must have lyrics."
            else:
                query += "\nSongs must not have lyrics."

            genai.configure(api_key=GENAI_API_KEY)  
            gemini = genai.GenerativeModel('gemini-2.0-flash')
            response = gemini.generate_content(query)

            print(f" this is line 69:{response.text.replace('*','')}")

            song_list=[]

            for line in response.text.replace("*",'').strip().splitlines():
                part=[part.strip() for part in line.split('-')]
                if len(part) < 2:
                    continue

                title=part[0]
                artist=part[1]

                search_song=search_spotify_song(title,artist)
                if search_song:
                    print(search_song)
                    song_list.append(search_song)
                else:
                    print(f"Song not found: {title.strip()} by {artist.strip()}")
                
            return song_list

        else:
            song_type="lyrics"
            if(mode_status.lyric_status == True):
                song_type="lyrics"
            elif(mode_status.lyric_status == False):
                song_type="no lyrics"

            query=f"""
            Recommend 5 songs related to {mode_status.mode_select}
            Only include songs with {song_type} 
            Title - Artist -length of the song- Spotify Link
    
            """
        #Note: Find a way to make it run when the person clicks
            if mode_status.lyric_status:
                query += "\nSongs must have lyrics."
            elif(mode_status.lyric_status==False):
                query += "\nSongs must not have lyrics."

            print(query)
            genai.configure(api_key=GENAI_API_KEY)  
            gemini = genai.GenerativeModel('gemini-2.0-flash')
            response = gemini.generate_content(query)

            print(response.text.replace('*',''))
            song_list=[]
            for line in response.text.strip().replace('*','').splitlines():
                part=[part.strip() for part in line.split('-')]
                if len(part) < 2:
                    continue

                title=part[0]
                artist=part[1]

                search_song=search_spotify_song(title,artist)
                if search_song:
                    print(search_song)
                    song_list.append(search_song)
                else:
                    print(f"Song not found: {title.strip()} by {artist.strip()}")
                
            return song_list
            
    
    except Exception as e:
        print(f'Error in processing song link: {e}')
        traceback.print_exc()
        return {"error": str(e)}


@router.get("/received-songs")
def get_received_songs() -> SongResponse:
    pass

