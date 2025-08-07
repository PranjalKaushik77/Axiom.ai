import os
import io
import uuid
from typing import Dict, List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
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
app = FastAPI(title="Cortex AI - Legal Assistant API", version="1.0.0")

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
    model = genai.GenerativeModel('gemini-1.5-flash')  # Updated model name
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

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "active", "service": "Cortex AI Legal Assistant API"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)