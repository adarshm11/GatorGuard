from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import datetime
import uvicorn  
from supabase import create_client
from supabase_client import check_if_exists, retrieve_permission, add_website_to_db, SUPABASE_KEY, SUPABASE_URL, add_user_mode,update_user_mode, check_if_user_exists
import google.generativeai as genai
from dotenv import load_dotenv
from song_output import router
import os

load_dotenv()
app = FastAPI()

app.include_router(router)
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
    mode: str

# Model for received text content
class TextContent(BaseModel):
    text_content: str

class DBEntry(BaseModel):
    url: str
    title: Optional[str] = None
    timestamp: Optional[str] = None
    study_allowed: Optional[bool] = None
    work_allowed: Optional[bool] = None
    leisure_allowed: Optional[bool] = None


class SongTextContent(BaseModel):
    song_text_content:str # thinking of doing a getting a mode

class SongLink(BaseModel):
    url:str
    title:str
    artist:str
    #album:str // we can add this latter if needed

class SongResponse(BaseModel):
    all_songs:List[SongLink]


class WebsiteCheckRequest(BaseModel):
    url: str

class ModeData(BaseModel):
    user_id: str
    mode: str
    submode: Optional[str] = None

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
    print(f"Received link: {link_data.url}, Title: {link_data.title}, Current mode: {link_data.mode}")
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
            return retrieve_permission(client, link_data.url, link_data.mode)  # Use the correct mode
        
        return evaluate_website_for_mode(link_data.url, link_data.title, link_data.mode)

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
        return response_text == "true"
    except Exception as e:
        print(f'Error in processing text content: {e}')
        return False


@app.post("/generate-songs")
def process_song_link():
    try:
        GENAI_API_KEY=os.getenv("GEMINI_API_KEY_2")
        if not(GENAI_API_KEY):
            raise HTTPException(status_code=400, detail="No API key found")
        genai.configure(api_key=GENAI_API_KEY)
        client=genai.GenerativeModel('gemini-2.0-flash')

        query=f"""
           Recommend 5 songs related to "study mode" with a focus on concentration for interview study.
           Only include songs with non-lyrics
           Generate me a new response, don't repeat the previous songs.: 
           Title - Artist - Spotify Link
 
        """
        #Note: Find a way to make it run when the person clicks

        response=client.generate_content(query)

        #Psuedo code for reload
        # IF reload == True
        #Generate new songs and remove the previous songs in the list 
        parts=response.text.strip().lower()

        #Note: Find a way to make it run when the person clicks
        
        evaluation=parts=="true"

        return bool(evaluation)
    except Exception as e:
        print(f'Error in processing text content: {e}')
        return False

@app.get("/received-songs")
def get_received_songs() -> SongResponse:
    return SongResponse(all_songs=songs)

  
@app.post('/add-website-to-db/')
def add_db_entry(db_entry: DBEntry):
    try:
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        
        # Check if website exists
        exists = check_if_exists(client, db_entry.url)
        
        if exists:
            # Create update dictionary with only the fields that are provided
            update_data = {"timestamp": db_entry.timestamp}
            
            # Only add fields that are explicitly provided
            if db_entry.study_allowed is not None:
                update_data["study_allowed"] = db_entry.study_allowed
                
            if db_entry.work_allowed is not None:
                update_data["work_allowed"] = db_entry.work_allowed
                
            if db_entry.leisure_allowed is not None:
                update_data["leisure_allowed"] = db_entry.leisure_allowed
            
            # Update the existing entry with only the provided fields
            response = client.from_('websites').update(update_data).eq('url', db_entry.url).execute()
            
            if response.data:
                return {
                    "success": True,
                    "message": "Entry updated in DB"
                }
            else:
                return {
                    "success": False,
                    "errorMessage": "Failed to update entry"
                }
        else:
            # For new entries, evaluate missing permissions using Gemini
            study_allowed = db_entry.study_allowed
            work_allowed = db_entry.work_allowed
            leisure_allowed = db_entry.leisure_allowed
            
            # Evaluate any missing permissions
            if study_allowed is None:
                study_allowed = evaluate_website_for_mode(db_entry.url, db_entry.title, "study")
                
            if work_allowed is None:
                work_allowed = evaluate_website_for_mode(db_entry.url, db_entry.title, "work")
                
            if leisure_allowed is None:
                leisure_allowed = evaluate_website_for_mode(db_entry.url, db_entry.title, "leisure")
            
            # Insert new entry with evaluated permissions
            result = add_website_to_db(
                client, 
                db_entry.url, 
                db_entry.title, 
                db_entry.timestamp, 
                study_allowed,
                work_allowed,
                leisure_allowed
            )
            
            if not result.get("success", False):
                return {
                    "success": False,
                    "errorMessage": result.get("error", "Unknown database error")
                }
                
            return { "success": True }
        
    except Exception as e:
        print(f"Exception in add_db_entry endpoint: {str(e)}")
        return {
            "success": False,
            "errorMessage": str(e),
        }
    
@app.post("/received-mode/")
def receive_browsing_mode(mode_data: ModeData):
    try:
        print(f'Received mode: {mode_data.mode}, Submode: {mode_data.submode}, User ID: {mode_data.user_id}')
        
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        
        # Check if user mode already exists
        try:
            print(f"Checking if user mode exists for ID: {mode_data.user_id}")
            response = client.from_('user_mode').select('*').eq('id', mode_data.user_id).execute()
            print(f"Response data: {response.data}")
            
            if response.data and len(response.data) > 0:
                print("User mode exists, updating...")
                # Update existing user mode
                result = update_user_mode(client, mode_data.user_id, mode_data.mode, mode_data.submode)
            else:
                print("User mode does not exist, adding...")
                # Add new user mode
                result = add_user_mode(client, mode_data.user_id, mode_data.mode, mode_data.submode)
            
            if result is True:
                return {"success": True, "message": "User mode updated successfully"}
            else:
                return {"success": False, "error": str(result)}
        except Exception as e:
            print(f"Error checking user mode: {str(e)}")
            return {"success": False, "error": f"Error checking user mode: {str(e)}"}
            
    except Exception as e:
        print(f"Error updating user mode: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/user-mode/{user_id}")
def get_user_mode(user_id: str):
    """Get current mode for a specific user"""
    try:
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        
        # Check if user exists
        if not check_if_user_exists(client, user_id):
            return {"success": False, "error": f"User {user_id} does not exist"}
            
        # Get the user's mode from the database
        response = client.from_('user_mode').select('mode_select,study_submode_select').eq('id', user_id).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "mode": response.data[0]["mode_select"],
                "submode": response.data[0].get("study_submode_select")
            }
        else:
            return {"success": False, "error": "User mode not found"}
            
    except Exception as e:
        print(f"Error getting user mode: {str(e)}")
        return {"success": False, "error": str(e)}


def evaluate_website_for_mode(url, title, mode):
    try:
        print(f"Evaluating website for {mode} mode: {url}")
        api_key = os.getenv('GEMINI_API_KEY')
        
        if not api_key:
            print("Missing Gemini API key")
            return False
            
        genai.configure(api_key=api_key)
        gemini = genai.GenerativeModel('gemini-2.0-flash')
        
        query = f'''
            A browser user is currently in {mode} mode. They just visited a website with this url: {url} and this title:
            {title or url}. Do you think this website is appropriate for a {mode} environment? Ignore whether or not it is allowed 
            for mature audiences, simply tell me if this website is related to {mode} material or not with a True/False answer.
        '''
        
        response = gemini.generate_content(query)
        response_text = response.text.strip().lower()
        print(f"Gemini evaluation for {mode} mode: {response_text}")
        
        return response_text == "true"
    except Exception as e:
        print(f"Error evaluating website for {mode}: {str(e)}")
        return False


@app.post("/check-website-exists")
def check_website_exists(request: WebsiteCheckRequest):
    try:
        client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
        exists = check_if_exists(client, request.url)
        
        if exists:
            # Get the stored permission values
            response = client.from_('websites').select('study_allowed,work_allowed,leisure_allowed').eq('url', request.url).limit(1).execute()
            if response.data and len(response.data) > 0:
                return {
                    "exists": True,
                    "study_allowed": response.data[0]["study_allowed"],
                    "work_allowed": response.data[0]["work_allowed"],
                    "leisure_allowed": response.data[0]["leisure_allowed"]
                }
        
        return {"exists": False}
        
    except Exception as e:
        print(f"Error checking website existence: {str(e)}")
        return {"exists": False, "error": str(e)}

@app.get("/links")
def get_links():
    """Return all stored links"""
    return {"links": received_links}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
