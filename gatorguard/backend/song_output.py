from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from typing import List
from enum import Enum
from fastapi import APIRouter
from supabase import create_client
from supabase_client import check_if_exists, retrieve_permission, add_website_to_db, SUPABASE_KEY, SUPABASE_URL, add_user_mode,update_user_mode
import google.generativeai as genai

from google import genai
from dotenv import load_dotenv
import os

router = APIRouter()
load_dotenv()

class ModeStatus(str,Enum):
    study="study"
    work="work"
    entertainment="entertainment"

class SubModeStatus(str,Enum):
    school_study="school study"
    interview_study="interview study"

class LyricStatus(str,Enum):
    lyric="lyrics"
    non_lyric="non-lyrics"

class UserMode(BaseModel):
    user_id:str
    mode_select:ModeStatus
    sub_mode_select:Optional[SubModeStatus]=None
    lyric_status:Optional[LyricStatus]='lyric'

class SongLink(BaseModel):
    url:str
    title:str
    artist:str
    #album:str // we can add this latter if needed

class SongResponse(BaseModel):
    all_songs:List[SongLink]

@router.post("/generate-songs")
def process_song_link(mode_status:UserMode):
    try:
        GENAI_API_KEY=os.getenv("GEMINI_API_KEY_2")
        client=genai.Client(api_key=GENAI_API_KEY)

        if not(GENAI_API_KEY):
            raise Exception("No API key found")
        
        if(mode_status.mode_select =='study' and mode_status.sub_mode_select):
            query=f"""
            Recommend 5 songs related to {mode_status.mode_select} with a focus on concentration for {mode_status.sub_mode_select}.
            Only include songs with {mode_status.lyric_status}
            Generate me a new response, don't repeat the previous songs.: 
            Title - Artist - Spotify Link
    
            """
            response=client.models.generate_content(
                model="gemini-2.0-flash",
                contents=query
            )
            print(response.text)
            parts=response.text.strip().lower()

            #Note: Find a way to make it run when the person clicks
            
            evaluation=parts=="true"
            return bool(evaluation)

        else:
            query=f"""
            Recommend 5 songs related to {mode_status.mode_select} with a focus on concentration.
            Only include songs with {mode_status.lyric_status} 
            Title - Artist - Spotify Link
    
            """
        #Note: Find a way to make it run when the person clicks

            response=client.models.generate_content(
                model="gemini-2.0-flash",
                contents=query
            )
            print(response.text)
        #Psuedo code for reload
        # IF reload == True
        #Generate new songs and remove the previous songs in the list 
        #Actualy thinking of doing this in the update function
            parts=response.text.strip().lower()

            #Note: Find a way to make it run when the person clicks
            evaluation=parts=="true"

            return bool(evaluation)
    
    except Exception as e:
        print(f'Error in processing song link: {e}')
        return False


@router.put("/reload-songs")
def reload_songs():
    pass


@router.get("/received-songs")
def get_received_songs() -> SongResponse:
    return SongResponse(all_songs=songs)
