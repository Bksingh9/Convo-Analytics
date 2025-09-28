from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import json
import os
import asyncio
from datetime import datetime
import uuid
import logging
import base64
import io

# Import our enhanced components
from app.agents import agent_manager, Priority
from app.realtime_processor import realtime_processor
from app.ai_enhanced_pipeline import ai_enhanced_pipeline
from app.pipeline import process_audio_to_packet as process_audio_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Convo Analytics API - Enhanced", 
    version="3.0.0",
    description="Advanced conversation analytics with AI-powered agentic layer and real-time processing"
)

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

# Pydantic models
class InteractionCreate(BaseModel):
    store_id: str = "store1"
    user_id: str = "user1"
    lang_hint: str = "auto"
    enable_realtime: bool = False
    enable_ai_analysis: bool = True

class TranslationRequest(BaseModel):
    text: str
    target_language: str = "hi"

class RealtimeSessionRequest(BaseModel):
    interaction_id: str
    user_id: str
    store_id: str
    language_hint: str = "auto"

class AudioChunkRequest(BaseModel):
    session_id: str
    audio_data: str  # Base64 encoded
    timestamp: Optional[float] = None

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    logger.info("Starting Convo Analytics API v3.0.0")
    
    try:
        # Initialize agent manager
        await agent_manager.initialize_agents()
        await agent_manager.start_all_agents()
        logger.info("Agent manager initialized")
        
        # Initialize real-time processor
        await realtime_processor.start()
        logger.info("Real-time processor started")
        
        # Initialize AI enhanced pipeline
        await ai_enhanced_pipeline.initialize()
        logger.info("AI enhanced pipeline initialized")
        
        logger.info("All systems initialized successfully")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Convo Analytics API")
    
    try:
        # Shutdown agent manager
        await agent_manager.shutdown_all_agents()
        logger.info("Agent manager shut down")
        
        # Shutdown real-time processor
        await realtime_processor.stop()
        logger.info("Real-time processor stopped")
        
        logger.info("Shutdown completed successfully")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Basic endpoints
@app.get("/")
async def root():
    return {
        "message": "Convo Analytics API v3.0.0 - Enhanced", 
        "status": "running",
        "features": [
            "AI-powered agentic layer",
            "Real-time processing",
            "Advanced transcription",
            "Quality control",
            "Multi-language support",
            "Speaker analysis",
            "Sentiment analysis",
            "Intent classification"
        ]
    }

@app.get("/v1/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "3.0.0",
        "components": {
            "agent_manager": "running",
            "realtime_processor": "running",
            "ai_pipeline": "initialized"
        }
    }

@app.get("/v1/config")
async def get_config():
    return {
        "voice_config": VOICE_CONFIG,
        "supported_languages": VOICE_CONFIG["supported_languages"],
        "max_file_size": "50MB",
        "supported_formats": ["wav", "mp3", "m4a", "webm"],
        "features": {
            "realtime_processing": True,
            "ai_analysis": True,
            "quality_control": True,
            "speaker_diarization": True,
            "multi_language": True
        }
    }

# Interaction management
@app.post("/v1/interactions")
async def create_interaction(interaction: InteractionCreate):
    """Create a new interaction with enhanced capabilities"""
    interaction_id = str(uuid.uuid4())
    
    # Create interaction object
    interaction_data = {
        "id": interaction_id,
        "store_id": interaction.store_id,
        "user_id": interaction.user_id,
        "lang_hint": interaction.lang_hint,
        "enable_realtime": interaction.enable_realtime,
        "enable_ai_analysis": interaction.enable_ai_analysis,
        "started_at": datetime.now().isoformat(),
        "ended_at": None,
        "transcript": "",
        "summary": "",
        "detected_language": "",
        "metrics": {},
        "conversation_quality": 0.0,
        "speaker_analysis": [],
        "keywords": [],
        "translations": {},
        "insights": [],
        "ai_analysis": {},
        "quality_scores": {},
        "processing_status": "created"
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

# Enhanced audio upload and processing
@app.post("/v1/upload")
async def upload_audio(
    file: UploadFile = File(...),
    interaction_id: str = Form(...),
    bookmarks: str = Form(""),
    target_language: Optional[str] = Form(None),
    use_ai_analysis: bool = Form(True),
    processing_mode: str = Form("enhanced")  # "basic", "enhanced", "realtime"
):
    """Upload and process audio file with enhanced capabilities"""
    if interaction_id not in DB:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/{interaction_id}_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update interaction status
        DB[interaction_id]["processing_status"] = "processing"
        
        # Choose processing mode
        if processing_mode == "enhanced" and use_ai_analysis:
            # Use AI enhanced pipeline
            result = await ai_enhanced_pipeline.process_audio_enhanced(
                temp_path, 
                {"stt": {"size": "base", "device": "auto"}}, 
                target_language or "auto"
            )
        else:
            # Use basic pipeline
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
            "insights": result.get("insights", []),
            "ai_analysis": result.get("nlp_analysis", {}),
            "quality_scores": result.get("quality_assessment", {}),
            "ended_at": datetime.now().isoformat(),
            "processing_status": "completed",
            "processing_mode": processing_mode,
            "processing_time": result.get("processing_time", 0.0)
        })
        
        # Clean up temp file
        os.remove(temp_path)
        
        return result
        
    except Exception as e:
        DB[interaction_id]["processing_status"] = "error"
        logger.error(f"Processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# Real-time processing endpoints
@app.post("/v1/realtime/sessions")
async def create_realtime_session(session_request: RealtimeSessionRequest):
    """Create a new real-time processing session"""
    try:
        session_id = await realtime_processor.create_session(
            interaction_id=session_request.interaction_id,
            user_id=session_request.user_id,
            store_id=session_request.store_id,
            language_hint=session_request.language_hint
        )
        
        return {
            "session_id": session_id,
            "status": "created",
            "interaction_id": session_request.interaction_id
        }
    except Exception as e:
        logger.error(f"Error creating real-time session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/realtime/audio")
async def add_audio_chunk(audio_request: AudioChunkRequest):
    """Add audio chunk to real-time session"""
    try:
        # Decode base64 audio data
        audio_data = base64.b64decode(audio_request.audio_data)
        
        success = await realtime_processor.add_audio_chunk(
            session_id=audio_request.session_id,
            audio_data=audio_data,
            timestamp=audio_request.timestamp
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add audio chunk")
        
        return {"status": "success", "message": "Audio chunk added"}
        
    except Exception as e:
        logger.error(f"Error adding audio chunk: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/realtime/sessions/{session_id}/status")
async def get_realtime_session_status(session_id: str):
    """Get real-time session status"""
    try:
        status = await realtime_processor.get_session_status(session_id)
        if not status:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return status
    except Exception as e:
        logger.error(f"Error getting session status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/realtime/sessions/{session_id}/transcript")
async def get_realtime_transcript(session_id: str, limit: int = 50):
    """Get real-time transcript"""
    try:
        transcript = await realtime_processor.get_session_transcript(session_id, limit)
        if transcript is None:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"transcript": transcript}
    except Exception as e:
        logger.error(f"Error getting transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/realtime/sessions/{session_id}/end")
async def end_realtime_session(session_id: str):
    """End real-time session and get final results"""
    try:
        final_results = await realtime_processor.end_session(session_id)
        if not final_results:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return final_results
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for real-time communication
@app.websocket("/v1/realtime/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()
    
    try:
        # Get session
        if session_id not in realtime_processor.sessions:
            await websocket.close(code=1008, reason="Session not found")
            return
        
        session = realtime_processor.sessions[session_id]
        session.websocket = websocket
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message["type"] == "audio_chunk":
                    # Process audio chunk
                    audio_data = base64.b64decode(message["data"])
                    await realtime_processor.add_audio_chunk(
                        session_id, 
                        audio_data, 
                        message.get("timestamp")
                    )
                
                elif message["type"] == "ping":
                    # Respond to ping
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if session_id in realtime_processor.sessions:
            realtime_processor.sessions[session_id].websocket = None

# Agent management endpoints
@app.get("/v1/agents/status")
async def get_agents_status():
    """Get status of all agents"""
    try:
        status = await agent_manager.get_agent_status()
        return status
    except Exception as e:
        logger.error(f"Error getting agent status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/agents/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a specific task"""
    try:
        task = await agent_manager.get_task_status(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "task_id": task.id,
            "status": task.status.value,
            "created_at": task.created_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "result": task.result,
            "error": task.error
        }
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced analytics endpoints
@app.get("/v1/analytics/voice-kpis")
async def get_voice_kpis():
    """Get enhanced voice-specific KPIs"""
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
        },
        "ai_insights": {
            "escalation_risk": 12.3,
            "quality_trend": "improving",
            "staff_performance": 4.1,
            "compliance_score": 96.8
        }
    }

@app.get("/v1/analytics/ai-insights")
async def get_ai_insights():
    """Get AI-powered insights"""
    return {
        "conversation_patterns": {
            "common_intents": [
                {"intent": "complaint", "frequency": 0.35},
                {"intent": "inquiry", "frequency": 0.28},
                {"intent": "request", "frequency": 0.22},
                {"intent": "compliment", "frequency": 0.15}
            ],
            "emotion_distribution": {
                "neutral": 0.45,
                "positive": 0.32,
                "negative": 0.23
            }
        },
        "quality_metrics": {
            "avg_transcription_confidence": 0.87,
            "avg_sentiment_confidence": 0.82,
            "avg_quality_score": 0.78,
            "resolution_rate": 0.89
        },
        "recommendations": [
            "Consider additional training for complaint handling",
            "Monitor escalation patterns in evening hours",
            "Review quality scores for interactions under 2 minutes"
        ]
    }

# Translation endpoints
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

# Quality control endpoints
@app.post("/v1/quality/assess")
async def assess_quality(
    interaction_id: str = Form(...),
    transcript: str = Form(...),
    analysis_result: str = Form(...)
):
    """Assess quality of interaction"""
    try:
        # Submit quality control task
        task_id = await agent_manager.submit_task(
            "quality_check",
            {
                "transcript": transcript,
                "analysis_result": json.loads(analysis_result)
            },
            Priority.HIGH
        )
        
        return {"task_id": task_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Quality assessment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Feedback endpoints
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
