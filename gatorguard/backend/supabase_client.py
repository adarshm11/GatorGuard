from supabase import Client
import os
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def check_if_exists(supabase: Client, website_url: str) -> bool:
    response = supabase.from_('websites').select('url').eq('url', website_url).limit(1).execute()
    return bool(response.data)

def retrieve_permission(supabase: Client, website_url: str, browser_mode: str) -> bool:
    # assumes entry has already been checked to exist
    response = supabase.from_('websites').select(f'{browser_mode}_allowed').eq('url', website_url).limit(1).execute()
    if response.data and len(response.data) > 0:
        return response.data[0][f'{browser_mode}_allowed']
    
    # it will only reach here if the query failed -> assume the entry does not exist. if so, allow it
    return True

def add_website_to_db(supabase: Client, website_url: str, website_title: str, timestamp: str = None, 
                      study_allowed: bool = False, work_allowed: bool = False, leisure_allowed: bool = True):
    try:
        # Check if website already exists
        if check_if_exists(supabase, website_url):
            print(f"Website already exists in database: {website_url}")
            return {"success": True, "duplicate": True}
        
        # Prepare data for insertion
        website_data = {
            'url': website_url,
            'title': website_title,
            'timestamp': timestamp,
            'study_allowed': study_allowed,
            'work_allowed': work_allowed,
            'leisure_allowed': leisure_allowed,
        }
        
        # Log insertion attempt
        print(f"Attempting to insert website: {website_url}")
        
        # Execute insert operation
        response = supabase.from_('websites').insert(website_data).execute()
        
        # Check for errors in the response
        if hasattr(response, 'error') and response.error:
            error_msg = str(response.error)
            print(f"Supabase error during insertion: {error_msg}")
            
            # Check if error is about unique constraint (website already exists)
            if "violates unique constraint" in error_msg or "duplicate key" in error_msg:
                print("Duplicate entry detected from error message")
                return {"success": True, "duplicate": True}
            
            return {"success": False, "error": error_msg}
        
        print(f"Successfully inserted website: {website_url}")
        return {"success": True, "duplicate": False}
        
    except Exception as e:
        print(f"Exception during website insertion: {str(e)}")
        return {"success": False, "error": str(e)}
    
    
''' DOES NOT WORK:

def clear_db():
    response = supabase.from_('websites').delete().execute()
    return bool(response.data)
'''

