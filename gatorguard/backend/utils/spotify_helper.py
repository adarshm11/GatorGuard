import requests
from dotenv import load_dotenv
import os
import requests
import base64
load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

def get_spotify_access_token():# Makes a request to Spotify API to get an access token
    url="https://accounts.spotify.com/api/token"
    auth=f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    b64_auth=base64.b64encode(auth.encode()).decode('utf-8')
    headers={
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data={
        "grant_type":"client_credentials"
    }
    response=requests.post(url,headers=headers,data=data)
    response_json=response.json()
    
    print(f"This is the response json: {response_json}")

    if response.status_code == 200:
        access_token=response_json.get('access_token')
        return access_token
    else:
        print("Error:",response_json)
        return None

def search_spotify_song(song_title, song_artist):
    access_token=get_spotify_access_token()
    if not access_token:
        return None
    
    url=f"https://api.spotify.com/v1/search?q=track:{song_title} artist:{song_artist}&type=track"
    print(url)
    auth_headers={
        "Authorization":f"Bearer {access_token}"
    }

    response=requests.get(url,headers=auth_headers)
    response_json=response.json()

    if(response_json["tracks"]["items"]):
        track=response_json["tracks"]["items"][0]
        spotify_url=track["external_urls"]['spotify']
        title=track["name"]
        song_length=track["duration_ms"]
        duration_min=song_length / 60000
        artist_name=track["artists"][0]["name"]

        return {
            'title':title,
            'artist':artist_name,
            'song_length':round(duration_min,2),
            'url':spotify_url
        }
    else:
        print("No results found for the song.")
        return None
