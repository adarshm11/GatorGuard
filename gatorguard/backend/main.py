from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import datetime
import uvicorn  
from supabase import create_client
from supabase_client import check_if_exists, retrieve_permission, add_website_to_db, SUPABASE_KEY, SUPABASE_URL
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI()

# Configure CORS to allow requests from your Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model for received link data
class LinkData(BaseModel):
    url: str
    title: Optional[str] = None
    timestamp: Optional[str] = None

# Model for received text content
class TextContent(BaseModel):
    text_content: str

class DBEntry(BaseModel):
    url: str
    title: Optional[str] = None
    timestamp: Optional[str] = None
    study_allowed: Optional[bool] = True
    work_allowed: Optional[bool] = True
    leisure_allowed: Optional[bool] = True


class SongTextContent(BaseModel):
    text_content:str

class SongTitle(BaseModel):
    url:str
    title:str
    artist:str
    album:str

class ModeData(BaseModel):
    mode: str

# Store links in memory (in real app, use a database)
received_links = []

@app.get("/")
def read_root():
    return {"status": "online", "message": "FastAPI backend for Chrome extension"}

@app.post("/received-link")
def receive_link(link_data: LinkData):
    # Add timestamp if not provided
    if not link_data.timestamp:
        link_data.timestamp = datetime.datetime.now().isoformat()
    
    # Log to console
    print(f"Received link: {link_data.url}, Title: {link_data.title}")
    is_website_allowed = process_link(link_data)

    return {"allowed": is_website_allowed}
    '''
    { allowed: true }
    { allowed: false }
    '''

def process_link(link_data: LinkData):
    try:
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        if check_if_exists(client, link_data.url):
            return retrieve_permission(client, link_data.url, 'study') # use study mode as default placeholder
        
        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key) # for now, assume it works without error checking
        gemini = genai.GenerativeModel('gemini-2.0-flash')
        query = f'''
            A browser user is currently trying to study. They just visited a website with this url: {link_data.url} and this title:
            {link_data.title}. Do you think this website is appropriate for a study environment? Ignore whether or not it is allowed 
            for mature audiences, simply tell me if this website is related to studying material or not with a True/False answer.
        '''
        response = gemini.generate_content(query)
        response_text = response.text.strip().lower()  
        return response_text == "true"
    
        # add_website_to_db(client, link_data.url, link_data.title, link_data.timestamp, study_allowed=evaluation)

    except Exception as e:
        print(f'Error: {e}')
        return False

@app.post("/received-text-content")
def receive_text_content(text_content: TextContent):
    print(f"Received text content: {text_content.text_content}")
    is_website_allowed = process_text_content(text_content)

    return {"allowed": is_website_allowed}

def process_text_content(text_content: TextContent):
    try:
        print("Processing text content...")
        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)  
        gemini = genai.GenerativeModel('gemini-2.0-flash')
        query = f'''
            A browser user is currently trying to study. They just visited a website with this content: {text_content.text_content}. 
            Do you think this website is appropriate for a study environment? Ignore whether or not it is allowed 
            for mature audiences, simply tell me if this website is related to studying material or not with a True/False answer.
        '''
        print("Sending query to Gemini model...")
        response = gemini.generate_content(query)
        print(f"Gemini response: {response.text}")  # Log the response for debugging
        response_text = response.text.strip().lower()
        print(f"Processed response text: {response_text}")
        return response_text == "true"
    except Exception as e:
        print(f'Error in processing text content: {e}')
        return False

@app.post('/add-website-to-db/')
def add_db_entry(db_entry: DBEntry):
    try:
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        add_to_db = add_website_to_db(client, db_entry.url, db_entry.title, db_entry.timestamp, db_entry.study_allowed) # change to include specific mode
        if not add_to_db:
            return {
                "success": True,
                "errorMessage": "Entry already existed in DB"
            }
        return { "success": True }
        
    except HTTPException as e:
        return {
            "success": False,
            "errorMessage": e.detail,
        }
    
@app.post("/received-mode/")
def receive_browsing_mode(mode_data: ModeData):
    print(f'Received mode: {mode_data.mode}')
    return {"success" : True}


@app.get("/links")
def get_links():
    """Return all stored links"""
    return {"links": received_links}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)