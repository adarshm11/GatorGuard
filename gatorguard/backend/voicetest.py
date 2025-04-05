import speech_recognition as sr
import google.generativeai as genai
import pyttsx3
import os
from dotenv import load_dotenv

load_dotenv()

def generate_response(user_text: str) -> str:
    # configure Gemini
    genai.configure(api_key=os.getenv('GEMINI_SPEECH_API_KEY'))
    model = genai.GenerativeModel(model_name='gemini-2.0-flash')

    query = f'Reply to this request as though it is a friendly conversation: {user_text}. Do not include any emojis in your response.'
    response = model.generate_content(query)
    return response.text

def text_to_speech(response: str) -> None:
    engine = pyttsx3.init()
    engine.say(text=response)
    engine.runAndWait()

if __name__ == '__main__':
    recognizer = sr.Recognizer()

    with sr.Microphone() as source:
        print('Say Something...')
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio)
        print("Processing...")
        response = generate_response(text)
        text_to_speech(response)
        print(response)
    except sr.UnknownValueError:
        print("Sorry, could not understand audio")
    except sr.RequestError as e:
        print(f"Could not request results; {e}")
    