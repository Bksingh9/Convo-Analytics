from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import json
import os
import asyncio
from datetime import datetime
import uuid

# Import our pipeline
from app.pipeline import process_audio_to_packet as process_audio_file

app = FastAPI(title="Convo Analytics API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo
DB = {}
TRAINING_DATA = {
    "role_classifications": [],
    "sentiment_labels": [],
    "language_detections": []
}

# Voice configuration
VOICE_CONFIG = {
    "supported_languages": ["english", "hindi", "tamil", "telugu", "bengali", "gujarati"],
    "quality_threshold": 0.7,
    "max_duration": 300
}

class InteractionCreate(BaseModel):
    store_id: str = "store1"
    user_id: str = "user1"
    lang_hint: str = "auto"

class TranslationRequest(BaseModel):
    text: str
    target_language: str = "hi"

@app.get("/")
async def root():
    return {"message": "Convo Analytics API v2.0.0", "status": "running"}

@app.get("/v1/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/v1/config")
async def get_config():
    return {
        "voice_config": VOICE_CONFIG,
        "supported_languages": VOICE_CONFIG["supported_languages"],
        "max_file_size": "50MB",
        "supported_formats": ["wav", "mp3", "m4a", "webm"]
    }

@app.post("/v1/interactions")
async def create_interaction(interaction: InteractionCreate):
    """Create a new interaction"""
    interaction_id = str(uuid.uuid4())
    
    # Create interaction object
    interaction_data = {
        "id": interaction_id,
        "store_id": interaction.store_id,
        "user_id": interaction.user_id,
        "lang_hint": interaction.lang_hint,
        "started_at": datetime.now().isoformat(),
        "ended_at": None,
        "transcript": "",
        "summary": "",
        "detected_language": "",
        "metrics": {},
        "conversation_quality": 0.0,
        "speaker_analysis": [],
        "keywords": [],
        "translations": {}
    }
    
    DB[interaction_id] = interaction_data
    
    return {"id": interaction_id, "status": "created"}

@app.get("/v1/interactions")
def list_interactions(store_id: Optional[str] = None, limit: int = 50, offset: int = 0):
    """List all interactions with optional filtering"""
    interactions = list(DB.values())
    
    # Filter by store_id if provided
    if store_id:
        interactions = [it for it in interactions if it["store_id"] == store_id]
    
    # Sort by started_at descending (newest first)
    interactions.sort(key=lambda x: x["started_at"], reverse=True)
    
    # Apply pagination
    total = len(interactions)
    interactions = interactions[offset:offset + limit]
    
    return {
        "interactions": interactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/v1/interactions/{interaction_id}")
async def get_interaction(interaction_id: str):
    """Get a specific interaction"""
    if interaction_id not in DB:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    return DB[interaction_id]

@app.post("/v1/upload")
async def upload_audio(
    file: UploadFile = File(...),
    interaction_id: str = Form(...),
    bookmarks: str = Form(""),
    target_language: Optional[str] = Form(None)
):
    """Upload and process audio file"""
    if interaction_id not in DB:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/{interaction_id}_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process the audio
        result = await process_audio_file(temp_path, target_language)
        
        # Update interaction with results
        DB[interaction_id].update({
            "transcript": result.get("transcript", ""),
            "summary": result.get("summary", ""),
            "detected_language": result.get("detected_language", ""),
            "metrics": result.get("metrics", {}),
            "conversation_quality": result.get("conversation_quality", 0.0),
            "speaker_analysis": result.get("speaker_analysis", []),
            "keywords": result.get("keywords", []),
            "translations": result.get("translations", {}),
            "ended_at": datetime.now().isoformat()
        })
        
        # Clean up temp file
        os.remove(temp_path)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/v1/metrics")
def metrics():
    """Enhanced metrics with voice analysis data"""
    if not DB:
        return {
            "red_flags": {},
            "objections": {},
            "handling": {},
            "sentiment": {"avg": 0.0},
            "voice_analysis": {
                "total_interactions": 0,
                "average_quality": 0.0,
                "language_distribution": {},
                "speaker_role_accuracy": 0.0
            }
        }
    
    # Basic metrics
    redflags = {}
    objections = {}
    handling = {}
    sentiment_sum = 0.0
    quality_sum = 0.0
    language_counts = {}
    role_accuracy_sum = 0.0
    n = 0
    
    for it in DB.values():
        if it.get("metrics"):
            sentiment_sum += it["metrics"].get("sentiment", 0.0)
            quality_sum += it.get("conversation_quality", 0.0)
            n += 1
        
        # Language distribution
        lang = it.get("detected_language", "unknown")
        language_counts[lang] = language_counts.get(lang, 0) + 1
        
        # Role accuracy (simplified)
        if it.get("speaker_analysis"):
            avg_confidence = sum(sa.get("confidence", 0) for sa in it["speaker_analysis"]) / len(it["speaker_analysis"])
            role_accuracy_sum += avg_confidence
    
    return {
        "red_flags": redflags,
        "objections": objections,
        "handling": handling,
        "sentiment": {"avg": (sentiment_sum / n) if n else 0.0},
        "voice_analysis": {
            "total_interactions": len(DB),
            "average_quality": (quality_sum / n) if n else 0.0,
            "language_distribution": language_counts,
            "speaker_role_accuracy": (role_accuracy_sum / n) if n else 0.0,
            "supported_languages": len(VOICE_CONFIG["supported_languages"])
        }
    }

@app.post("/v1/translate")
async def translate_text(request: TranslationRequest):
    """Translate text to target language"""
    # Mock translation for demo
    translations = {
        "hi": f"[Hindi] {request.text}",
        "ta": f"[Tamil] {request.text}",
        "te": f"[Telugu] {request.text}",
        "bn": f"[Bengali] {request.text}",
        "gu": f"[Gujarati] {request.text}"
    }
    
    return {
        "original_text": request.text,
        "translated_text": translations.get(request.target_language, request.text),
        "target_language": request.target_language
    }

@app.get("/v1/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "supported_languages": VOICE_CONFIG["supported_languages"],
        "language_codes": {
            "english": "en",
            "hindi": "hi", 
            "tamil": "ta",
            "telugu": "te",
            "bengali": "bn",
            "gujarati": "gu"
        }
    }

# Analytics endpoints
@app.get("/v1/analytics/voice-kpis")
async def get_voice_kpis():
    """Get voice-specific KPIs"""
    return {
        "voice_quality_metrics": {
            "avg_clarity_score": 87.3,
            "avg_volume_level": 72.1,
            "background_noise_percentage": 15.2,
            "speech_rate_wpm": 145.8,
            "pause_frequency": 3.2
        },
        "conversation_metrics": {
            "avg_conversation_duration": "4m 32s",
            "completion_rate": 94.2,
            "customer_satisfaction": 4.3,
            "first_call_resolution": 87.1
        },
        "sentiment_analysis": {
            "positive_interactions": 68,
            "neutral_interactions": 45,
            "negative_interactions": 43,
            "overall_sentiment": 0.23
        }
    }

@app.get("/v1/analytics/model-performance")
async def get_model_performance():
    """Get AI model performance metrics"""
    return {
        "accuracy": 94.2,
        "precision": 92.8,
        "recall": 95.1,
        "f1_score": 93.9,
        "model_version": "2.1.3",
        "last_training": "2 hours ago",
        "training_samples": 12547
    }

@app.get("/v1/analytics/audio-quality")
async def get_audio_quality_metrics():
    """Get audio quality metrics"""
    return {
        "avg_clarity": 87.3,
        "avg_volume": 72.1,
        "noise_level": 15.2,
        "speech_rate": 145.8,
        "pause_frequency": 3.2
    }

@app.get("/v1/analytics/business-insights")
async def get_business_insights():
    """Get business insights"""
    return {
        "customer_satisfaction": 4.3,
        "resolution_rate": 87.1,
        "avg_handle_time": "4m 32s",
        "repeat_calls": 12.3
    }

@app.get("/v1/analytics/trends")
async def get_analytics_trends(time_range: str = "24h"):
    """Get analytics trends"""
    return {
        "time_range": time_range,
        "trends": {
            "sentiment": "improving",
            "quality": "stable",
            "volume": "increasing"
        }
    }

@app.post("/v1/feedback")
async def submit_feedback(feedback: Dict[str, Any]):
    """Submit feedback for model improvement"""
    # Store feedback in training data
    if "role_classification" in feedback:
        TRAINING_DATA["role_classifications"].append(feedback["role_classification"])
    if "sentiment_label" in feedback:
        TRAINING_DATA["sentiment_labels"].append(feedback["sentiment_label"])
    if "language_detection" in feedback:
        TRAINING_DATA["language_detections"].append(feedback["language_detection"])
    
    return {
        "status": "feedback_received",
        "training_samples": len(TRAINING_DATA["role_classifications"]),
        "message": "Thank you for the feedback. This will help improve our models."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
