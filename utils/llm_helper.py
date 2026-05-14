import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def get_api_key():
    return os.getenv("GOOGLE_API_KEY")

def get_interview_question(role, experience_level, previous_questions):
    """
    Generates an interview question based on the role and experience level.
    """
    api_key = get_api_key()
    if not api_key:
        return "Error: API Key not set. Please go to Settings to configure it."
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    You are an expert technical interviewer.
    Generate a relevant interview question for a {experience_level} {role}.
    Do not ask any of these previously asked questions: {previous_questions}
    
    Provide only the question text, no introductions or explanations.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Error generating question: {str(e)}"

def evaluate_answer(question, answer, role):
    """
    Evaluates the candidate's answer and returns structured JSON containing feedback and a score.
    """
    api_key = get_api_key()
    if not api_key:
        return {"error": "API Key not set. Please go to Settings to configure it."}
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    You are an expert technical interviewer evaluating a candidate for a {role} position.
    
    Question asked: {question}
    Candidate's answer: {answer}
    
    Provide constructive feedback on the answer. Include what was good and what could be improved.
    
    You MUST respond STRICTLY with a valid JSON object with EXACTLY these two keys:
    "feedback_text": "Your detailed feedback formatted in Markdown",
    "score": <an integer score from 1 to 10>
    
    Do not wrap the JSON in Markdown code blocks, just output the raw JSON.
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Try to find JSON block using regex
        import re
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            text = match.group(1)
        else:
            # Fallback: try to find anything that looks like a JSON object
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                text = match.group(1)
            
        return json.loads(text.strip())
    except Exception as e:
        return {"error": f"Error evaluating answer: {str(e)}"}
