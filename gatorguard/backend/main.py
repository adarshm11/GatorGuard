from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from typing import List
import datetime
import uvicorn  
from supabase import create_client
from supabase_client import check_if_exists, retrieve_permission, add_website_to_db, SUPABASE_KEY, SUPABASE_URL, add_user_mode,update_user_mode
import google.generativeai as genai
from google import genai
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

# Store links in memory (in real app, use a database)
received_links = []

songs=[]
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
    { not exist in db -> schema TBD }
    '''

def process_link(link_data: LinkData):
    try:
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        if check_if_exists(client, link_data.url):
            return retrieve_permission(client, link_data.url, 'study') # use study mode as default placeholder
        
        # the entry doesn't exist: placeholder is call gemini
        # supposed to pass back to the next.js route to allow Claude to interpret the link
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
        evaluation = response_text == "true"
    
        # To be implemented
        add_website_to_db(client, link_data.url, link_data.title, link_data.timestamp, study_allowed=evaluation)
        
        return bool(evaluation)

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
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)      
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
        evaluation = response_text == "true"
        return bool(evaluation)
    except Exception as e:
        print(f'Error in processing text content: {e}')
        return False


@app.get("/links")
def get_links():
    """Return all stored links"""
    return {"links": received_links}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # api_key = os.getenv('GEMINI_API_KEY')
    # genai.configure(api_key=api_key) # for now, assume it works without error checking
    # gemini = genai.GenerativeModel('gemini-2.0-flash')
    # query = f'''
    #     A browser user is currently trying to study. They just visited a website with this url: https://www.youtube.com/watch?v=KpB-j6LWH28 and this title:
    #     Chandler Doesn't Have a Dream | Friends - YouTube. Do you think this website is appropriate for a study environment? Ignore whether or not it is allowed 
    #     for mature audiences, simply tell me if this website is related to studying material or not. Then give a True/False answer
    #     to the question.
    # '''
    # response = gemini.generate_content(query)
    # response.text.replace('\n', '')
    # print(response.text)