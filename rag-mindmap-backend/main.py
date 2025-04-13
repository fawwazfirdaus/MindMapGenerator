import os
import uuid
import json
from typing import List, Optional

import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# --- Configuration & Models ---

load_dotenv() # Load environment variables from .env file

# IMPORTANT: Configure your Google API Key
# Option 1: Set the GOOGLE_API_KEY environment variable
# Option 2: Replace "YOUR_API_KEY" below (less secure)
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    # Consider raising an error or providing a default for local testing
    # raise ValueError("GOOGLE_API_KEY environment variable not set.")
    print("Warning: GOOGLE_API_KEY environment variable not set.")
    # api_key = "YOUR_API_KEY" # Replace if necessary, but use environment variables preferably
else:
    genai.configure(api_key=api_key)

class Branch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    summary: str
    children: List['Branch'] = []

# --- FastAPI Application ---

app = FastAPI(
    title="RAG Mindmap Generator API",
    description="Generates a mind map from an uploaded PDF using Gemini.",
    version="0.1.0",
)

# --- CORS Middleware ---
# Allow requests from your frontend development server
# Adjust origins if your frontend runs on a different port
origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:3000", # Common React dev port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    # Add your frontend's production URL here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)

# --- Helper: Define the prompt ---
# Moved outside the endpoint for clarity
MINDMAP_GENERATION_PROMPT = """
Analyze the content of the provided PDF document. Your goal is to generate a hierarchical mind map representing the key topics and sub-topics discussed.

Follow these steps:
1. Identify the main overarching topic of the document. This will be the root branch.
2. Identify the major sections or primary sub-topics branching off the main topic.
3. For each major section, identify further nested sub-topics if applicable. Create a hierarchy up to a reasonable depth (e.g., 3-4 levels).
4. For EACH topic and sub-topic (including the root), generate a concise, informative summary (1-2 sentences).
5. Structure your ENTIRE output STRICTLY as a single JSON object conforming to the following Pydantic schema:

```json
{
  "id": "string (generate a unique UUID)",
  "topic": "string (the topic title)",
  "summary": "string (the concise summary)",
  "children": [
    {
      "id": "string (generate a unique UUID)",
      "topic": "string",
      "summary": "string",
      "children": [ ... ] // Nested children, if any
    }
    // ... more children at this level
  ]
}
```

Important Rules:
- Generate unique UUIDs for all `id` fields.
- Ensure the output is ONLY the JSON object, with no surrounding text, explanations, or markdown formatting (like ```json ... ```).
- If the document content is unclear or insufficient to generate a meaningful mind map, return a JSON object representing a single root node with an appropriate message in the summary. Example:
  ```json
  {
    "id": "...", 
    "topic": "Analysis Error", 
    "summary": "Could not extract meaningful topics from the provided PDF.", 
    "children": []
  }
  ```
"""

# --- API Endpoints ---

@app.post("/generate_mindmap/", response_model=Branch)
async def generate_mindmap_from_pdf(file: UploadFile = File(...) ):
    """
    Accepts a PDF file upload, sends it to Gemini for analysis,
    and returns a hierarchical mind map structure.
    """
    print(f"Received file: {file.filename}, Content-Type: {file.content_type}")

    if not api_key:
         raise HTTPException(status_code=503, detail="API key not configured. Cannot connect to AI service.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    try:
        pdf_content = await file.read() # Read file content as bytes

        # --- Gemini API Call ---
        print("Preparing PDF content for Gemini...")
        pdf_part = {
            "mime_type": "application/pdf",
            "data": pdf_content
        }

        print("Instantiating Gemini model...")
        # Use a model that supports PDF input, like 1.5 Flash or Pro
        model = genai.GenerativeModel('gemini-2.0-flash')

        print("Sending request to Gemini API...")
        # Request JSON output directly
        generation_config = genai.types.GenerationConfig(response_mime_type="application/json")
        response = await model.generate_content_async(
            [MINDMAP_GENERATION_PROMPT, pdf_part],
            generation_config=generation_config,
            request_options={'timeout': 600} # Set a timeout (e.g., 10 minutes)
        )
        print("Received response from Gemini API.")

        # --- Parse and Validate ---
        try:
            # The response.text should be the JSON string when response_mime_type is set
            print("Attempting to parse JSON response...")
            mind_map_data = json.loads(response.text)
            
            # Add UUIDs recursively if the model didn't provide them (as a fallback)
            def add_uuids(branch_data):
                if not branch_data.get('id'):
                    branch_data['id'] = str(uuid.uuid4())
                for child in branch_data.get('children', []):
                    add_uuids(child)
            
            add_uuids(mind_map_data) # Ensure IDs are present

            print("Validating JSON structure against Pydantic model...")
            validated_branch = Branch(**mind_map_data) # Validate using Pydantic
            print("Successfully parsed and validated mind map structure.")
            return validated_branch
            
        except json.JSONDecodeError as json_err:
            print(f"Error: Failed to decode JSON response from Gemini: {json_err}")
            print(f"Raw response text: {response.text[:500]}...") # Log the start of the raw response
            raise HTTPException(status_code=500, detail=f"Failed to parse JSON response from AI model: {json_err}")
        except Exception as pydantic_err: # Catch Pydantic validation errors etc.
             print(f"Error: Failed to validate mind map structure: {pydantic_err}")
             print(f"Parsed data causing validation error: {mind_map_data}") # Log the data
             raise HTTPException(status_code=500, detail=f"Invalid structure received from AI model: {pydantic_err}")

    except genai.types.BlockedPromptException as blocked_err:
        print(f"Error: Gemini API request blocked: {blocked_err}")
        raise HTTPException(status_code=400, detail=f"Content generation blocked. Please check the PDF content. Details: {blocked_err}")
    except Exception as e:
        print(f"An unexpected error occurred during PDF processing or AI interaction: {e}")
        # Log the full traceback for unexpected errors
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")

    finally:
        if file:
            await file.close()
            print("Closed uploaded file.")

# --- Uvicorn Runner (for local development) ---
if __name__ == "__main__":
    import uvicorn
    print("Starting Uvicorn server on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000) 