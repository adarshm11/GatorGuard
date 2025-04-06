from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from main import ModeData
import httpx
import uvicorn

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpokenRequest(BaseModel):
    request: str
    user_id: str

@app.post('/receive-spoken-request')
async def process_spoken_request(req: SpokenRequest):
    print("Received spoken request")
    try:
        api_key=os.getenv('GEMINI_SPEECH_API_KEY')
        if not api_key:
            raise HTTPException(status_code=400, detail='Invalid Gemini API Key')
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        query = f'''Here is a request: {req.request}. This request should be in a very similar format to "Switch to [mode] mode." 
        If it is, your response should be only the word(s) [mode] that was said. 
        If the request is in a different format, respond with "Invalid request". 
        '''
        response = model.generate_content(query)
        print("Model has surveyed the query")
        mode = response.text.strip().lower()
        print(f"Mode: {mode}")
        if mode is None or mode == 'invalid request':
            return {"response": "invalid request"}
        print("not an invalid request")
        submode = None
        if len(mode.split()) > 1: # study mode with submode
            print("entered if statement")
            mode = mode.split()
            mode, submode = mode[0], mode[1:]
            print("finished first split")
            submode = ' '.join(submode)
            print("done here")
        print(mode)
        print(submode)
        print(req.user_id)
        print(f"mode_data split: mode {mode}, submode {submode}, userid {req.user_id}")
        mode_data = ModeData(user_id=req.user_id, mode=mode, submode=submode)
        print("created a ModeData instance")
        print("calling db function")
        async with httpx.AsyncClient() as client:
            response = await client.post('http://localhost:8000/received-mode/', json=mode_data.model_dump())
        db_response = response.json()
        print("received response from db")
        if db_response["success"]:
            message = f"Set user mode to {mode}"
            if submode:
                message += f': {submode}'
            return {"message": message}
        return {"error": f"Error accessing database: {db_response['error']}"}

    except Exception as e:
        return {"error": str(e)}
    
if __name__ == '__main__':
    uvicorn.run('voice_assistant:app', host="0.0.0.0", port=8001, reload=True)