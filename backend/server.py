import os
import io
import uuid
from typing import Dict, List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import PyPDF2
import re
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Corpus AI - Legal Assistant API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
    print("⚠️  WARNING: GEMINI_API_KEY not set or using placeholder!")
    print("Please set your Gemini API key in the .env file")
    # Don't exit, let the app start but show error on API calls
    GEMINI_API_KEY = None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')  # Updated model name
else:
    model = None

# In-memory storage for contract data
contract_storage: Dict[str, Dict] = {}

class QuestionRequest(BaseModel):
    question: str
    contract_id: str

class ContractResponse(BaseModel):
    contract_id: str
    filename: str
    pages: int
    chunks: int
    message: str

class AnswerResponse(BaseModel):
    answer: str
    contract_id: str
    question: str
    timestamp: str


class ClauseSuggestionRequest(BaseModel):
    playbook: Optional[str] = None
    negotiation_goal: Optional[str] = None
    tone: Optional[str] = None
    counterparty_position: Optional[str] = None


class ClauseSuggestionResponse(BaseModel):
    contract_id: str
    clause_index: int
    original_clause: str
    ai_suggestion: str
    guidance_summary: str
    timestamp: str

def extract_text_from_pdf(file_content: bytes) -> tuple[str, int]:
    """Extract text from PDF file and return text with page count"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text_content = ""
        page_count = len(pdf_reader.pages)
        
        for page in pdf_reader.pages:
            text_content += page.extract_text() + "\n"
        
        if not text_content.strip():
            raise ValueError("No text content could be extracted from the PDF")
            
        return text_content, page_count
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

def intelligent_chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """
    Intelligently chunk text for legal documents, preserving clause boundaries
    """
    try:
        # Clean the text
        text = re.sub(r'\n+', '\n', text.strip())
        
        # Try to split by common legal document markers
        legal_markers = [
            r'\n\d+\.\s+',  # Numbered clauses
            r'\n\([a-z]\)\s+',  # Lettered sub-clauses  
            r'\n[A-Z][A-Z\s]+:',  # Section headers
            r'\nWHEREAS,',  # Whereas clauses
            r'\nNOW, THEREFORE',  # Therefore clauses
        ]
        
        chunks = []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        current_chunk = ""
        for sentence in sentences:
            # If adding this sentence would exceed chunk size
            if len(current_chunk + sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap
                words = current_chunk.split()
                overlap_text = " ".join(words[-overlap//10:]) if len(words) > overlap//10 else ""
                current_chunk = overlap_text + " " + sentence if overlap_text else sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        # Add the final chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Ensure we have at least one chunk
        if not chunks:
            chunks = [text[:chunk_size]]
            
        return chunks
    
    except Exception as e:
        # Fallback to simple chunking if intelligent chunking fails
        words = text.split()
        chunks = []
        current_chunk = []
        
        for word in words:
            current_chunk.append(word)
            if len(" ".join(current_chunk)) > chunk_size:
                chunks.append(" ".join(current_chunk[:-1]))
                current_chunk = [word]
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
            
        return chunks if chunks else [text]

def generate_legal_prompt(question: str, contract_chunks: List[str]) -> str:
    """Generate a structured prompt for Gemini focused on legal analysis"""
    
    combined_content = "\n\n".join([f"[Chunk {i+1}]:\n{chunk}" for i, chunk in enumerate(contract_chunks)])
    
    prompt = f"""You are an expert legal contract analyst with deep knowledge of Indian and international contract law. You have been provided with chunks from a legal contract document. Your task is to analyze these contract sections and provide accurate, clause-specific answers to legal questions.

IMPORTANT GUIDELINES:
1. Base your analysis STRICTLY on the contract content provided
2. Do not make assumptions or add information not present in the contract
3. If information is not available in the provided sections, clearly state this
4. Provide specific clause references where possible
5. Be precise and professional in your legal terminology
6. Highlight potential legal implications or concerns
7. Structure your response clearly with relevant headings if needed

USER QUESTION:
{question}

CONTRACT SECTIONS:
{combined_content}

ANALYSIS:
Please provide a detailed, accurate answer based solely on the contract content provided above. Include specific references to relevant clauses or sections where applicable."""

    return prompt


def generate_clause_suggestion_prompt(
    clause_text: str,
    playbook: Optional[str] = None,
    negotiation_goal: Optional[str] = None,
    tone: Optional[str] = None,
    counterparty_position: Optional[str] = None,
) -> str:
    """Generate a prompt for clause redrafting aligned with user playbooks."""

    playbook_section = f"\nPLAYBOOK GUIDANCE:\n{playbook}" if playbook else "\nPLAYBOOK GUIDANCE:\nNo explicit playbook provided. Apply best practices for commercial contracts in India."
    goal_section = f"\nNEGOTIATION GOAL:\n{negotiation_goal}" if negotiation_goal else "\nNEGOTIATION GOAL:\nAchieve a balanced clause protecting our client's interests."
    tone_section = f"\nPREFERRED TONE:\n{tone}" if tone else "\nPREFERRED TONE:\nProfessional and collaborative."
    counterparty_section = f"\nCOUNTERPARTY POSITION:\n{counterparty_position}" if counterparty_position else "\nCOUNTERPARTY POSITION:\nNo specific inputs provided."

    prompt = f"""You are an expert contract negotiator supporting an Indian legal team. Rewrite the clause provided below to align with the team's negotiation playbooks while keeping it enforceable.

CURRENT CLAUSE:
{clause_text}
{playbook_section}
{goal_section}
{tone_section}
{counterparty_section}

TASKS:
1. Provide an alternative clause that reflects the playbook guidance and negotiation goals.
2. Keep language precise, enforceable, and commercially reasonable.
3. Highlight any critical protections or concessions introduced.
4. Return concise guidance (max 3 bullet points) explaining strategic rationale.

OUTPUT FORMAT:
Alternative Clause:
<drafted clause>

Guidance:
- Bullet 1
- Bullet 2
- Bullet 3 (optional)
"""
    return prompt

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "active", "service": "Corpus AI Legal Assistant API"}

@app.post("/api/upload", response_model=ContractResponse)
async def upload_contract(file: UploadFile = File(...)):
    """Upload and process a PDF contract"""
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File size too large. Maximum size is 10MB")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Extract text from PDF
        text_content, page_count = extract_text_from_pdf(file_content)
        
        # Chunk the text intelligently
        chunks = intelligent_chunk_text(text_content)
        
        # Generate unique contract ID
        contract_id = str(uuid.uuid4())
        
        # Store contract data
        contract_storage[contract_id] = {
            "filename": file.filename,
            "text_content": text_content,
            "chunks": chunks,
            "page_count": page_count,
            "upload_time": datetime.now().isoformat()
        }
        
        return ContractResponse(
            contract_id=contract_id,
            filename=file.filename,
            pages=page_count,
            chunks=len(chunks),
            message=f"Contract processed successfully. {len(chunks)} chunks created from {page_count} pages."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question about an uploaded contract"""
    
    # Check if Gemini API is configured
    if not model:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API key not configured. Please add your API key to the .env file and restart the server."
        )
    
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    if request.contract_id not in contract_storage:
        raise HTTPException(status_code=404, detail="Contract not found. Please upload a contract first.")
    
    try:
        contract_data = contract_storage[request.contract_id]
        chunks = contract_data["chunks"]
        
        # Generate prompt for Gemini
        prompt = generate_legal_prompt(request.question, chunks)
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        
        if not response.text:
            raise HTTPException(status_code=500, detail="Failed to generate response from AI")
        
        return AnswerResponse(
            answer=response.text,
            contract_id=request.contract_id,
            question=request.question,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")

@app.get("/api/contracts/{contract_id}")
async def get_contract_info(contract_id: str):
    """Get information about an uploaded contract"""
    
    if contract_id not in contract_storage:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract_data = contract_storage[contract_id]
    
    return {
        "contract_id": contract_id,
        "filename": contract_data["filename"],
        "pages": contract_data["page_count"],
        "chunks": len(contract_data["chunks"]),
        "upload_time": contract_data["upload_time"]
    }


@app.get("/api/contracts/{contract_id}/clauses")
async def list_contract_clauses(contract_id: str):
    """Return all clause chunks for a contract."""

    if contract_id not in contract_storage:
        raise HTTPException(status_code=404, detail="Contract not found")

    contract_data = contract_storage[contract_id]
    clauses_payload = []

    for idx, clause in enumerate(contract_data["chunks"]):
        preview = clause.strip()
        preview = preview if len(preview) <= 240 else preview[:240].rstrip() + "…"
        clauses_payload.append(
            {
                "index": idx,
                "preview": preview,
                "text": clause,
            }
        )

    return {
        "contract_id": contract_id,
        "clauses": clauses_payload,
        "total_clauses": len(contract_data["chunks"]),
    }


@app.post("/api/contracts/{contract_id}/clauses/{clause_index}/suggest", response_model=ClauseSuggestionResponse)
async def suggest_clause_alternative(
    contract_id: str,
    clause_index: int = Path(..., ge=0),
    request: ClauseSuggestionRequest = None,
):
    """Generate an AI-assisted alternative clause draft."""

    if not model:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured. Please add your API key to the .env file and restart the server."
        )

    if contract_id not in contract_storage:
        raise HTTPException(status_code=404, detail="Contract not found")

    contract_data = contract_storage[contract_id]
    clauses = contract_data["chunks"]

    if clause_index < 0 or clause_index >= len(clauses):
        raise HTTPException(status_code=400, detail="Invalid clause index")

    clause_text = clauses[clause_index]

    try:
        prompt = generate_clause_suggestion_prompt(
            clause_text=clause_text,
            playbook=request.playbook if request else None,
            negotiation_goal=request.negotiation_goal if request else None,
            tone=request.tone if request else None,
            counterparty_position=request.counterparty_position if request else None,
        )

        response = model.generate_content(prompt)

        if not response.text:
            raise HTTPException(status_code=500, detail="Failed to generate clause suggestion")

        suggestion_text = response.text.strip()
        if "Guidance:" in suggestion_text:
            alternative_clause, guidance = suggestion_text.split("Guidance:", 1)
            alternative_clause = alternative_clause.replace("Alternative Clause:", "").strip()
            guidance_summary = guidance.strip()
        else:
            alternative_clause = suggestion_text
            guidance_summary = "Guidance not provided by model. Review the rewritten clause carefully."

        return ClauseSuggestionResponse(
            contract_id=contract_id,
            clause_index=clause_index,
            original_clause=clause_text.strip(),
            ai_suggestion=alternative_clause,
            guidance_summary=guidance_summary,
            timestamp=datetime.now().isoformat(),
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate clause alternative: {str(exc)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)