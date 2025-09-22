from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime

@dataclass
class VoiceCharacteristics:
    pitch_mean: float
    pitch_std: float
    energy_mean: float
    energy_std: float
    spectral_centroid: float
    mfcc_features: List[float]
    zero_crossing_rate: float
    speaking_rate: float
    voice_type: str  # "male", "female", "child", "unknown"
    confidence: float

@dataclass
class SpeakerInfo:
    speaker_id: str
    voice_characteristics: VoiceCharacteristics
    role: str  # "customer", "staff", "unknown"
    language: str
    confidence: float

@dataclass
class Insight:
    type: str
    category: str
    message: str
    confidence: float
    keywords: List[str] = field(default_factory=list)
    details: str = ""
    action_required: bool = False

@dataclass
class Interaction:
    id: str
    store_id: str
    user_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    consent: bool = True
    lang_hint: str = "auto"
    bookmarks: List[float] = field(default_factory=list)
    audio_path: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    action_items: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)
    requests: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    metrics: Dict[str, float] = field(default_factory=dict)
    speaker_turns: List[Dict] = field(default_factory=list)
    translations: Dict[str, str] = field(default_factory=dict)
    # Enhanced fields
    speaker_analysis: List[Dict] = field(default_factory=list)
    insights: List[Dict] = field(default_factory=list)
    detected_language: str = "en"
    voice_characteristics: Dict[str, VoiceCharacteristics] = field(default_factory=dict)
    conversation_quality: float = 0.0
    staff_performance_score: float = 0.0
    customer_satisfaction_score: float = 0.0

# In-memory store for the starter; swap to DB later
DB: Dict[str, Interaction] = {}

# Training data for voice models
TRAINING_DATA = {
    "voice_samples": [],
    "language_samples": [],
    "role_classifications": []
}

# Configuration for voice analysis
VOICE_CONFIG = {
    "supported_languages": [
        {"code": "en", "name": "English"},
        {"code": "hi", "name": "Hindi"},
        {"code": "ta", "name": "Tamil"},
        {"code": "te", "name": "Telugu"},
        {"code": "bn", "name": "Bengali"},
        {"code": "mr", "name": "Marathi"},
        {"code": "gu", "name": "Gujarati"},
        {"code": "kn", "name": "Kannada"},
        {"code": "ml", "name": "Malayalam"},
        {"code": "pa", "name": "Punjabi"},
        {"code": "or", "name": "Odia"},
        {"code": "as", "name": "Assamese"},
        {"code": "ne", "name": "Nepali"}
    ],
    "voice_types": ["male", "female", "child", "unknown"],
    "speaker_roles": ["customer", "staff", "unknown"],
    "insight_categories": [
        "customer_satisfaction",
        "staff_performance", 
        "conversation_flow",
        "red_flag",
        "language_barrier",
        "product_issue",
        "service_quality"
    ]
}
