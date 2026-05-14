import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("No API key found in .env file.")
else:
    genai.configure(api_key=api_key)
    try:
        print("Available models that support text generation:")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(m.name)
    except Exception as e:
        import traceback
        error_msg = f"Error listing models: {e}\n{traceback.format_exc()}"
        print(error_msg)
        with open("error.txt", "w") as f:
            f.write(error_msg)
