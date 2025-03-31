import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import autogen
import re

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set. Check your .env file.")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    language: str

CONFIG_LIST = [
    {
        "model": "llama3-70b-8192",
        "api_key": GROQ_API_KEY,
        "base_url": "https://api.groq.com/openai/v1",
    }
]

coding_agent = autogen.AssistantAgent(
    name="CodeGenerator",
    llm_config={
        "config_list": CONFIG_LIST,
        "temperature": 0.3,
        "timeout": 120,
    },
    system_message=f"""You are an expert coding assistant. 
    When asked to provide code, return ONLY the code block with proper syntax highlighting. 
    Do not include any explanations or additional text outside the code block.
    Format your response like this:
    ```language
    // your code here
    ```"""
)

user_agent = autogen.UserProxyAgent(
    name="User",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=1,
    code_execution_config=False,
    llm_config=False
)

def extract_code(response_text: str, language: str) -> str:
    """Extracts and formats the code block from the response"""
    pattern = rf"```(?:{language.lower()}|)?\n(.*?)```"
    match = re.search(pattern, response_text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return f"Error: Could not generate valid {language} code. Please try again."

@app.post("/autogen-chat")
async def autogen_chat(request: ChatRequest):
    try:
        logging.info(f"Request: {request.message} in {request.language}")
        
        # Initiate chat with specific instructions
        response = user_agent.initiate_chat(
            coding_agent,
            message=f"Provide complete, runnable {request.language} code for: {request.message}. Only return the code block.",
            clear_history=True
        )
        
        last_message = response.chat_history[-1]["content"] if response.chat_history else ""
        clean_code = extract_code(last_message, request.language)
        
        return {"response": clean_code}

    except Exception as e:
        logging.error(f"Error: {str(e)}")
        return {"response": f"Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)