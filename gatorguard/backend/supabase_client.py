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
    if check_if_exists(supabase, website_url):
        return False
    data, error = supabase.from_('websites').insert({
        'url': website_url,
        'title': website_title,
        'timestamp': timestamp,
        'study_allowed': study_allowed,
        'work_allowed': work_allowed,
        'leisure_allowed': leisure_allowed,
    }).execute()
    if error:
        raise HTTPException(status_code=500, detail='Error accessing Supabase DB')
    return True
''' DOES NOT WORK:

def clear_db():
    response = supabase.from_('websites').delete().execute()
    return bool(response.data)
'''

    