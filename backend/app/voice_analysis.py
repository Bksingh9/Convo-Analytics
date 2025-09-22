import numpy as np
import librosa
import soundfile as sf
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import tempfile
import os

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

class VoiceAnalyzer:
    def __init__(self):
        self.sample_rate = 16000
        
    def extract_voice_characteristics(self, audio_path: str, start_time: float = 0, end_time: Optional[float] = None) -> VoiceCharacteristics:
        """Extract comprehensive voice characteristics from audio segment"""
        try:
            # Load audio
            y, sr = librosa.load(audio_path, sr=self.sample_rate, offset=start_time, duration=end_time-start_time if end_time else None)
            
            if len(y) == 0:
                return self._default_characteristics()
            
            # Extract pitch (F0)
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr, threshold=0.1)
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            pitch_mean = np.mean(pitch_values) if pitch_values else 0
            pitch_std = np.std(pitch_values) if pitch_values else 0
            
            # Extract energy
            energy = librosa.feature.rms(y=y)[0]
            energy_mean = np.mean(energy)
            energy_std = np.std(energy)
            
            # Spectral centroid
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
            
            # MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            mfcc_features = np.mean(mfccs, axis=1).tolist()
            
            # Zero crossing rate
            zcr = np.mean(librosa.feature.zero_crossing_rate(y))
            
            # Speaking rate (approximate)
            speaking_rate = len(y) / sr  # duration in seconds
            
            # Voice type classification based on pitch
            voice_type, confidence = self._classify_voice_type(pitch_mean, pitch_std)
            
            return VoiceCharacteristics(
                pitch_mean=float(pitch_mean),
                pitch_std=float(pitch_std),
                energy_mean=float(energy_mean),
                energy_std=float(energy_std),
                spectral_centroid=float(spectral_centroid),
                mfcc_features=mfcc_features,
                zero_crossing_rate=float(zcr),
                speaking_rate=float(speaking_rate),
                voice_type=voice_type,
                confidence=confidence
            )
        except Exception as e:
            print(f"Error extracting voice characteristics: {e}")
            return self._default_characteristics()
    
    def _classify_voice_type(self, pitch_mean: float, pitch_std: float) -> Tuple[str, float]:
        """Classify voice type based on pitch characteristics"""
        if pitch_mean == 0:
            return "unknown", 0.0
        
        # Typical pitch ranges (Hz)
        if pitch_mean < 165:  # Male range
            return "male", min(0.9, 1.0 - abs(pitch_mean - 120) / 100)
        elif pitch_mean < 265:  # Female range
            return "female", min(0.9, 1.0 - abs(pitch_mean - 220) / 100)
        else:  # Child/high-pitched
            return "child", min(0.9, 1.0 - abs(pitch_mean - 300) / 100)
    
    def _default_characteristics(self) -> VoiceCharacteristics:
        """Return default characteristics when extraction fails"""
        return VoiceCharacteristics(
            pitch_mean=0.0,
            pitch_std=0.0,
            energy_mean=0.0,
            energy_std=0.0,
            spectral_centroid=0.0,
            mfcc_features=[0.0] * 13,
            zero_crossing_rate=0.0,
            speaking_rate=0.0,
            voice_type="unknown",
            confidence=0.0
        )
    
    def analyze_speaker_segments(self, audio_path: str, segments: List[Tuple[float, float]]) -> List[SpeakerInfo]:
        """Analyze voice characteristics for each speech segment"""
        speaker_infos = []
        
        for i, (start, end) in enumerate(segments):
            # Extract voice characteristics
            voice_chars = self.extract_voice_characteristics(audio_path, start, end)
            
            # Determine role based on voice characteristics and context
            role, role_confidence = self._determine_speaker_role(voice_chars, i, len(segments))
            
            # Determine language (will be enhanced with actual language detection)
            language = "auto"  # Placeholder for now
            
            speaker_info = SpeakerInfo(
                speaker_id=f"speaker_{i}",
                voice_characteristics=voice_chars,
                role=role,
                language=language,
                confidence=role_confidence
            )
            speaker_infos.append(speaker_info)
        
        return speaker_infos
    
    def _determine_speaker_role(self, voice_chars: VoiceCharacteristics, segment_index: int, total_segments: int) -> Tuple[str, float]:
        """Determine if speaker is customer or staff based on voice characteristics and context"""
        # Simple heuristic-based approach
        # In a real implementation, this would use trained models
        
        confidence = 0.5  # Base confidence
        
        # Staff typically speak more formally and consistently
        if voice_chars.speaking_rate > 0 and voice_chars.energy_std < 0.1:
            confidence += 0.2  # More consistent energy suggests staff
        
        # Customer might have more emotional variation
        if voice_chars.pitch_std > 50:
            confidence -= 0.1  # High pitch variation might indicate customer
        
        # First speaker is often staff (greeting)
        if segment_index == 0:
            confidence += 0.3
        
        # Alternate between customer and staff (simple heuristic)
        if segment_index % 2 == 0:
            role = "staff"
        else:
            role = "customer"
        
        return role, min(0.9, max(0.1, confidence))

class IndianLanguageDetector:
    """Detector for Indian languages"""
    
    def __init__(self):
        self.language_models = {}
        self.supported_languages = {
            'hi': 'Hindi',
            'ta': 'Tamil', 
            'te': 'Telugu',
            'bn': 'Bengali',
            'mr': 'Marathi',
            'gu': 'Gujarati',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'pa': 'Punjabi',
            'or': 'Odia',
            'as': 'Assamese',
            'ne': 'Nepali'
        }
    
    def detect_language(self, text: str) -> Tuple[str, float]:
        """Detect Indian language from text"""
        if not text.strip():
            return 'en', 0.0
        
        # Simple keyword-based detection for now
        # In production, use proper language detection models
        text_lower = text.lower()
        
        # Hindi indicators
        hindi_indicators = ['है', 'हैं', 'का', 'की', 'के', 'में', 'पर', 'से', 'को', 'ने']
        hindi_score = sum(1 for indicator in hindi_indicators if indicator in text_lower)
        
        # Tamil indicators
        tamil_indicators = ['ஆக', 'உள்ள', 'இருந்து', 'வரை', 'போது', 'முதல்', 'வரை']
        tamil_score = sum(1 for indicator in tamil_indicators if indicator in text_lower)
        
        # Telugu indicators
        telugu_indicators = ['లో', 'కు', 'నుండి', 'వరకు', 'పై', 'కోసం', 'గురించి']
        telugu_score = sum(1 for indicator in telugu_indicators if indicator in text_lower)
        
        # Bengali indicators
        bengali_indicators = ['এ', 'তে', 'র', 'কে', 'হয়', 'আছে', 'থাকে', 'করতে']
        bengali_score = sum(1 for indicator in bengali_indicators if indicator in text_lower)
        
        scores = {
            'hi': hindi_score,
            'ta': tamil_score,
            'te': telugu_score,
            'bn': bengali_score
        }
        
        if max(scores.values()) > 0:
            detected_lang = max(scores, key=scores.get)
            confidence = min(0.9, scores[detected_lang] / len(text.split()) * 10)
            return detected_lang, confidence
        
        return 'en', 0.5  # Default to English

class AdvancedInsightsGenerator:
    """Generate intelligent insights from conversation analysis"""
    
    def __init__(self):
        self.insight_templates = {
            'customer_satisfaction': {
                'positive': "Customer shows high satisfaction with {aspect}",
                'negative': "Customer expresses concern about {aspect}",
                'neutral': "Customer has neutral sentiment about {aspect}"
            },
            'staff_performance': {
                'excellent': "Staff demonstrates excellent {skill}",
                'good': "Staff shows good {skill}",
                'needs_improvement': "Staff could improve {skill}"
            },
            'conversation_flow': {
                'smooth': "Conversation flows smoothly with good interaction",
                'interrupted': "Conversation has interruptions or overlaps",
                'confused': "Customer seems confused about {topic}"
            }
        }
    
    def generate_insights(self, 
                         transcript: str, 
                         sentiment: float, 
                         speaker_infos: List[SpeakerInfo],
                         keywords: List[str],
                         metrics: Dict) -> List[Dict]:
        """Generate intelligent insights from conversation data"""
        insights = []
        
        # Customer satisfaction insights
        if sentiment > 0.3:
            insights.append({
                'type': 'customer_satisfaction',
                'category': 'positive',
                'message': f"Customer shows high satisfaction (sentiment: {sentiment:.2f})",
                'confidence': min(0.9, sentiment),
                'keywords': keywords[:3]
            })
        elif sentiment < -0.3:
            insights.append({
                'type': 'customer_satisfaction', 
                'category': 'negative',
                'message': f"Customer expresses concerns (sentiment: {sentiment:.2f})",
                'confidence': min(0.9, abs(sentiment)),
                'keywords': keywords[:3]
            })
        
        # Staff performance insights
        staff_segments = [s for s in speaker_infos if s.role == 'staff']
        if staff_segments:
            avg_confidence = np.mean([s.confidence for s in staff_segments])
            if avg_confidence > 0.7:
                insights.append({
                    'type': 'staff_performance',
                    'category': 'excellent',
                    'message': "Staff demonstrates professional communication",
                    'confidence': avg_confidence,
                    'details': f"Voice consistency: {avg_confidence:.2f}"
                })
        
        # Conversation flow insights
        if len(speaker_infos) > 1:
            insights.append({
                'type': 'conversation_flow',
                'category': 'smooth',
                'message': f"Multi-turn conversation with {len(speaker_infos)} speakers",
                'confidence': 0.8,
                'details': f"Roles: {', '.join(set(s.role for s in speaker_infos))}"
            })
        
        # Red flag insights
        if metrics.get('red_flag_score', 0) > 0.5:
            insights.append({
                'type': 'red_flag',
                'category': 'warning',
                'message': f"High red flag score detected: {metrics['red_flag_score']:.2f}",
                'confidence': min(0.9, metrics['red_flag_score']),
                'action_required': True
            })
        
        return insights
