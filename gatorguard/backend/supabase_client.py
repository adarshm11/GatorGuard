from supabase import Client
import os
from dotenv import load_dotenv

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

def check_if_user_exists(supabase:Client,user_id:str)-> bool:
    response = supabase.from_('user_profiles').select('id').eq('id', user_id).limit(1).execute()
    return bool(response.data)

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
      
def add_user_mode(supabase:Client, user_id:str, mode_select:str, sub_mode_select:str=None):
    MODE_SELECT = ['study', 'work', 'leisure']
    SUB_MODE_SELECT = ["school", "interview"]  # Match your frontend values

    if not (check_if_user_exists(supabase, user_id)):
        raise ValueError(f"User {user_id} does not exist in the database.")

    if mode_select.lower() not in MODE_SELECT:
        raise ValueError(f"Invalid mode: {mode_select}. Valid modes are: {MODE_SELECT}")
    
    if mode_select.lower() == 'study' and sub_mode_select:
        if sub_mode_select.lower() not in SUB_MODE_SELECT:
            raise ValueError(f"Invalid sub mode: {sub_mode_select}. Valid sub modes are: {SUB_MODE_SELECT}")
    
    # Ensure the data is properly formatted for insert
    insert_data = {
        'id': user_id,
        'mode_select': mode_select
    }
    
    # Only add submode if it's study mode
    if mode_select.lower() == 'study':
        insert_data['study_submode_select'] = sub_mode_select
    
    print(f"Inserting user mode with data: {insert_data}")
    
    try:
        # Use custom error handling
        data, error = supabase.from_('user_mode').insert(insert_data).execute()
        
        if error:
            print(f"Error adding user mode: {error}")
            return error
        else:
            print(f"User mode added successfully: {data}")
            return True
    except Exception as e:
        print(f"Exception adding user mode: {str(e)}")
        return str(e)

def update_user_mode(supabase:Client, user_id:str, mode_select:str, sub_mode_select:str=None):
    MODE_SELECT = ['study', 'work', 'leisure']
    SUB_MODE_SELECT = ["school", "interview"]  # Match your frontend values

    if not (check_if_user_exists(supabase, user_id)):
        raise ValueError(f"User {user_id} does not exist in the database.")

    if mode_select.lower() not in MODE_SELECT:
        raise ValueError(f"Invalid mode: {mode_select}. Valid modes are: {MODE_SELECT}")
    
    if mode_select.lower() == 'study' and sub_mode_select:
        if sub_mode_select.lower() not in SUB_MODE_SELECT:
            raise ValueError(f"Invalid sub mode: {sub_mode_select}. Valid sub modes are: {SUB_MODE_SELECT}")

    # Prepare update data properly
    update_data = {
        'mode_select': mode_select
    }
    
    # Handle study_submode_select explicitly
    if mode_select.lower() == 'study':
        update_data['study_submode_select'] = sub_mode_select
    else:
        # For non-study modes, explicitly set submode to null
        update_data['study_submode_select'] = None
    
    print(f"Updating user mode with data: {update_data}")
    
    try:
        # Execute the update without assuming a specific return structure
        response = supabase.from_("user_mode").update(update_data).eq('id', user_id).execute()
        
        # Check for error in response
        if hasattr(response, 'error') and response.error:
            print(f"Error updating user mode: {response.error}")
            return response.error
        else:
            print(f"User mode updated successfully: {response.data if hasattr(response, 'data') else 'No data returned'}")
            return True
    except Exception as e:
        print(f"Exception updating user mode: {str(e)}")
        return str(e)


