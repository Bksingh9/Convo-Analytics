import os, uuid, yaml, tempfile
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .models import Interaction, DB, VOICE_CONFIG
from .enhanced_pipeline import process_audio_to_packet

ROOT = os.path.dirname(os.path.abspath(__file__))
CFG = yaml.safe_load(open(os.path.join(ROOT,"config.yaml"), "r"))

app = FastAPI(title="FYND Conversation Analytics - Enhanced", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174","http://127.0.0.1:5173","http://127.0.0.1:5174","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NewInteraction(BaseModel):
    store_id: str
    user_id: str
    started_at: Optional[datetime] = None
    consent: bool = True
    lang_hint: str = "auto"

class VoiceAnalysisRequest(BaseModel):
    interaction_id: str
    analyze_voice: bool = True
    detect_language: bool = True
    generate_insights: bool = True

class TrainingDataRequest(BaseModel):
    interaction_id: str
    correct_role: str  # "customer" or "staff"
    correct_language: str
    feedback: str

@app.get("/v1/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow(), "version": "2.0.0"}

@app.get("/v1/config")
def get_config():
    return {
        **CFG,
        "voice_config": VOICE_CONFIG,
        "features": {
            "voice_analysis": True,
            "indian_languages": True,
            "speaker_detection": True,
            "advanced_insights": True,
            "real_time_processing": True
        }
    }

@app.get("/v1/languages")
def get_supported_languages():
    return {
        "supported_languages": VOICE_CONFIG["supported_languages"],
        "translation_pairs": [
            {"from": "en", "to": "hi", "name": "English to Hindi"},
            {"from": "hi", "to": "en", "name": "Hindi to English"},
            {"from": "en", "to": "ta", "name": "English to Tamil"},
            {"from": "ta", "to": "en", "name": "Tamil to English"},
            {"from": "en", "to": "te", "name": "English to Telugu"},
            {"from": "te", "to": "en", "name": "Telugu to English"},
            {"from": "en", "to": "bn", "name": "English to Bengali"},
            {"from": "bn", "to": "en", "name": "Bengali to English"}
        ]
    }

@app.post("/v1/interactions")
def create_interaction(body: NewInteraction):
    iid = str(uuid.uuid4())
    it = Interaction(
        id=iid,
        store_id=body.store_id,
        user_id=body.user_id,
        started_at=body.started_at or datetime.utcnow(),
        consent=body.consent,
        lang_hint=body.lang_hint
    )
    DB[iid] = it
    return {
        "id": iid, 
        "store_id": it.store_id, 
        "user_id": it.user_id, 
        "started_at": it.started_at.isoformat(),
        "features": ["voice_analysis", "indian_languages", "speaker_detection"]
    }

@app.post("/v1/upload")
async def upload(interaction_id: str, file: UploadFile = File(...), bookmarks: Optional[str] = None):
    if interaction_id not in DB:
        raise HTTPException(404, "interaction not found")
    
    it = DB[interaction_id]
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await file.read())
        wav_path = tmp.name
    
    it.audio_path = wav_path
    
    # Parse bookmarks
    if bookmarks:
        try:
            it.bookmarks = [float(x) for x in bookmarks.split(",")]
        except:
            it.bookmarks = []
    
    # Enhanced processing with voice analysis
    print(f"Processing with enhanced pipeline for interaction {interaction_id}")
    packet = process_audio_to_packet(wav_path, CFG, it.lang_hint)
    
    # Update interaction with enhanced data
    it.transcript = packet["transcript"]
    it.summary = packet["summary"]
    it.keywords = packet["keywords"]
    it.metrics = packet["metrics"]
    it.speaker_analysis = packet["speaker_analysis"]
    it.insights = packet["insights"]
    it.detected_language = packet["detected_language"]
    it.translations = packet["translations"]
    it.ended_at = datetime.utcnow()
    
    # Calculate quality scores
    it.conversation_quality = packet["metrics"].get("interaction_quality", 0.0)
    it.staff_performance_score = sum(sa.get("confidence", 0) for sa in packet["speaker_analysis"] if sa.get("role") == "staff") / max(1, len([sa for sa in packet["speaker_analysis"] if sa.get("role") == "staff"]))
    it.customer_satisfaction_score = max(0, min(100, (packet["metrics"].get("sentiment", 0) + 1) * 50))
    
    return {
        "id": it.id,
        "transcript": it.transcript,
        "summary": it.summary,
        "keywords": it.keywords,
        "segments": packet["segments"],
        "metrics": it.metrics,
        "speaker_analysis": it.speaker_analysis,
        "insights": it.insights,
        "detected_language": it.detected_language,
        "translations": it.translations,
        "conversation_quality": it.conversation_quality,
        "staff_performance_score": it.staff_performance_score,
        "customer_satisfaction_score": it.customer_satisfaction_score
    }

@app.get("/v1/interactions/{interaction_id}")
def get_interaction(interaction_id: str):
    it = DB.get(interaction_id)
    if not it:
        raise HTTPException(404, "not found")
    
    return {
        "id": it.id,
        "store_id": it.store_id,
        "user_id": it.user_id,
        "started_at": it.started_at,
        "ended_at": it.ended_at,
        "bookmarks": it.bookmarks,
        "transcript": it.transcript,
        "summary": it.summary,
        "keywords": it.keywords,
        "metrics": it.metrics,
        "speaker_analysis": it.speaker_analysis,
        "insights": it.insights,
        "detected_language": it.detected_language,
        "translations": it.translations,
        "conversation_quality": it.conversation_quality,
        "staff_performance_score": it.staff_performance_score,
        "customer_satisfaction_score": it.customer_satisfaction_score
    }

@app.get("/v1/interactions/{interaction_id}/voice-analysis")
def get_voice_analysis(interaction_id: str):
    it = DB.get(interaction_id)
    if not it:
        raise HTTPException(404, "interaction not found")
    
    if not it.speaker_analysis:
        raise HTTPException(404, "voice analysis not available")
    
    return {
        "interaction_id": interaction_id,
        "speaker_analysis": it.speaker_analysis,
        "voice_insights": {
            "total_speakers": len(it.speaker_analysis),
            "customer_segments": len([s for s in it.speaker_analysis if s.get("role") == "customer"]),
            "staff_segments": len([s for s in it.speaker_analysis if s.get("role") == "staff"]),
            "average_confidence": sum(s.get("confidence", 0) for s in it.speaker_analysis) / len(it.speaker_analysis),
            "voice_types": list(set(s.get("voice_characteristics", {}).get("voice_type", "unknown") for s in it.speaker_analysis))
        }
    }

@app.get("/v1/interactions/{interaction_id}/insights")
def get_insights(interaction_id: str):
    it = DB.get(interaction_id)
    if not it:
        raise HTTPException(404, "interaction not found")
    
    if not it.insights:
        raise HTTPException(404, "insights not available")
    
    return {
        "interaction_id": interaction_id,
        "insights": it.insights,
        "summary": {
            "total_insights": len(it.insights),
            "insight_types": list(set(i.get("type", "unknown") for i in it.insights)),
            "action_required": any(i.get("action_required", False) for i in it.insights),
            "high_confidence_insights": len([i for i in it.insights if i.get("confidence", 0) > 0.7])
        }
    }

@app.post("/v1/translate")
def translate_text(body: dict):
    try:
        from .enhanced_pipeline import translate_text as translate_func
        translated_text = translate_func(body["text"], body["target_language"], body.get("source_language"))
        return {
            "original_text": body["text"], 
            "translated_text": translated_text, 
            "target_language": body["target_language"],
            "source_language": body.get("source_language", "auto")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

@app.get("/v1/interactions/{interaction_id}/conversation-map")
def get_conversation_map(interaction_id: str):
    it = DB.get(interaction_id)
    if not it or not it.speaker_analysis:
        raise HTTPException(404, "Interaction or speaker analysis not found")
    
    conversation_map = []
    for i, speaker_info in enumerate(it.speaker_analysis):
        # Find corresponding segment
        segment = it.segments[i] if i < len(it.segments) else (0, 0)
        conversation_map.append({
            "start": segment[0],
            "end": segment[1],
            "speaker": speaker_info.get("role", "unknown"),
            "speaker_id": speaker_info.get("speaker_id", f"speaker_{i}"),
            "confidence": speaker_info.get("confidence", 0.0),
            "voice_type": speaker_info.get("voice_characteristics", {}).get("voice_type", "unknown"),
            "language": speaker_info.get("language", "en"),
            "text": f"Segment {i+1} - {speaker_info.get('role', 'unknown')} speaking"
        })
    
    return {
        "interaction_id": interaction_id,
        "conversation_map": conversation_map,
        "summary": {
            "total_segments": len(conversation_map),
            "speakers": list(set(c["speaker"] for c in conversation_map)),
            "languages": list(set(c["language"] for c in conversation_map))
        }
    }

@app.post("/v1/training/feedback")
def submit_training_feedback(body: TrainingDataRequest):
    """Submit feedback for training voice models"""
    it = DB.get(body.interaction_id)
    if not it:
        raise HTTPException(404, "interaction not found")
    
    # Store training data (in production, this would go to a proper training database)
    from .models import TRAINING_DATA
    TRAINING_DATA["role_classifications"].append({
        "interaction_id": body.interaction_id,
        "predicted_role": it.speaker_analysis[0].get("role", "unknown") if it.speaker_analysis else "unknown",
        "correct_role": body.correct_role,
        "predicted_language": it.detected_language,
        "correct_language": body.correct_language,
        "feedback": body.feedback,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {
        "status": "feedback_received",
        "training_samples": len(TRAINING_DATA["role_classifications"]),
        "message": "Thank you for the feedback. This will help improve our models."
    }

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
        if it.metrics:
            sentiment_sum += it.metrics.get("sentiment", 0.0)
            quality_sum += it.conversation_quality
            n += 1
        
        # Language distribution
        lang = it.detected_language
        language_counts[lang] = language_counts.get(lang, 0) + 1
        
        # Role accuracy (simplified)
        if it.speaker_analysis:
            avg_confidence = sum(sa.get("confidence", 0) for sa in it.speaker_analysis) / len(it.speaker_analysis)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
