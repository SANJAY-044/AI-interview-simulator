import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from utils.llm_helper import get_interview_question, evaluate_answer
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Interview Simulator Dashboard")

os.makedirs("static", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

class StartRequest(BaseModel):
    role: str
    experience_level: str

class ChatRequest(BaseModel):
    role: str
    experience_level: str
    current_question: str
    answer: str
    questions_asked: List[str]

class SettingsRequest(BaseModel):
    api_key: str

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.post("/api/start")
async def start_interview(req: StartRequest):
    question = get_interview_question(req.role, req.experience_level, [])
    if question.startswith("Error"):
        print(f"\n\n❌ ERROR: {question}\n\n")
        raise HTTPException(status_code=500, detail=question)
    return {"question": question}

@app.post("/api/chat")
async def chat_interaction(req: ChatRequest):
    eval_result = evaluate_answer(req.current_question, req.answer, req.role)
    if "error" in eval_result:
         raise HTTPException(status_code=500, detail=eval_result["error"])
         
    feedback = eval_result.get("feedback_text", "No feedback provided.")
    score = eval_result.get("score", 0)
         
    next_question = get_interview_question(req.role, req.experience_level, req.questions_asked)
    if next_question.startswith("Error"):
         raise HTTPException(status_code=500, detail=next_question)
         
    return {
        "feedback": feedback,
        "score": score,
        "next_question": next_question
    }

@app.post("/api/settings")
async def update_settings(req: SettingsRequest):
    os.environ["GOOGLE_API_KEY"] = req.api_key
    return {"status": "success"}
