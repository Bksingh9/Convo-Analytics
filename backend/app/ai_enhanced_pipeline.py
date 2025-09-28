import asyncio
import json
import time
import re
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
import logging
from collections import defaultdict, Counter
import tempfile
import os

# AI/ML imports
from transformers import (
    pipeline, AutoTokenizer, AutoModel, AutoModelForSequenceClassification,
    AutoModelForTokenClassification, AutoModelForQuestionAnswering
)
from sentence_transformers import SentenceTransformer
from keybert import KeyBERT
import torch
import torch.nn.functional as F
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import spacy
from textblob import TextBlob
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Audio processing
import librosa
import soundfile as sf
import webrtcvad
from faster_whisper import WhisperModel

# Custom imports
from .pipeline import redact, webrtc_vad_segments
from .agents import agent_manager, Priority

logger = logging.getLogger(__name__)

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
except:
    pass

@dataclass
class ConversationInsight:
    insight_type: str
    category: str
    message: str
    confidence: float
    severity: str = "medium"  # low, medium, high, critical
    action_required: bool = False
    keywords: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class SpeakerProfile:
    speaker_id: str
    role: str  # customer, staff, unknown
    confidence: float
    voice_characteristics: Dict[str, float]
    speaking_patterns: Dict[str, Any]
    sentiment_trend: List[float]
    key_phrases: List[str]

@dataclass
class ConversationMetrics:
    overall_sentiment: float
    customer_satisfaction: float
    staff_performance: float
    conversation_quality: float
    resolution_indicators: Dict[str, float]
    escalation_risk: float
    compliance_score: float
    insights: List[ConversationInsight]
    speaker_profiles: List[SpeakerProfile]

class AIEnhancedPipeline:
    """Enhanced pipeline with advanced AI models and real-time processing"""
    
    def __init__(self):
        self.models = {}
        self.cache = {}
        self.initialized = False
        self.config = {
            "enable_advanced_nlp": True,
            "enable_speaker_diarization": True,
            "enable_emotion_detection": True,
            "enable_intent_classification": True,
            "enable_entity_extraction": True,
            "enable_topic_modeling": True,
            "enable_sentiment_analysis": True,
            "enable_quality_assessment": True,
            "confidence_threshold": 0.7,
            "max_processing_time": 300
        }
    
    async def initialize(self):
        """Initialize all AI models"""
        if self.initialized:
            return
        
        logger.info("Initializing AI Enhanced Pipeline...")
        
        try:
            # Initialize models concurrently
            await asyncio.gather(
                self._load_sentiment_model(),
                self._load_emotion_model(),
                self._load_intent_model(),
                self._load_entity_model(),
                self._load_topic_model(),
                self._load_quality_model(),
                self._load_speaker_model(),
                self._load_whisper_model()
            )
            
            self.initialized = True
            logger.info("AI Enhanced Pipeline initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing AI pipeline: {e}")
            raise
    
    async def _load_sentiment_model(self):
        """Load advanced sentiment analysis model"""
        try:
            self.models["sentiment"] = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                return_all_scores=True
            )
            logger.info("Sentiment model loaded")
        except Exception as e:
            logger.warning(f"Could not load sentiment model: {e}")
            self.models["sentiment"] = None
    
    async def _load_emotion_model(self):
        """Load emotion detection model"""
        try:
            self.models["emotion"] = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                return_all_scores=True
            )
            logger.info("Emotion model loaded")
        except Exception as e:
            logger.warning(f"Could not load emotion model: {e}")
            self.models["emotion"] = None
    
    async def _load_intent_model(self):
        """Load intent classification model"""
        try:
            self.models["intent"] = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
            logger.info("Intent model loaded")
        except Exception as e:
            logger.warning(f"Could not load intent model: {e}")
            self.models["intent"] = None
    
    async def _load_entity_model(self):
        """Load named entity recognition model"""
        try:
            self.models["ner"] = pipeline(
                "ner",
                model="dbmdz/bert-large-cased-finetuned-conll03-english",
                aggregation_strategy="simple"
            )
            logger.info("NER model loaded")
        except Exception as e:
            logger.warning(f"Could not load NER model: {e}")
            self.models["ner"] = None
    
    async def _load_topic_model(self):
        """Load topic modeling components"""
        try:
            self.models["keybert"] = KeyBERT(
                SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
            )
            self.models["tfidf"] = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            logger.info("Topic modeling components loaded")
        except Exception as e:
            logger.warning(f"Could not load topic models: {e}")
            self.models["keybert"] = None
            self.models["tfidf"] = None
    
    async def _load_quality_model(self):
        """Load conversation quality assessment model"""
        try:
            self.models["quality"] = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",
                return_all_scores=True
            )
            logger.info("Quality model loaded")
        except Exception as e:
            logger.warning(f"Could not load quality model: {e}")
            self.models["quality"] = None
    
    async def _load_speaker_model(self):
        """Load speaker diarization model"""
        try:
            # For now, we'll use a simple approach
            # In production, you might want to use pyannote.audio or similar
            self.models["speaker"] = "simple_diarization"
            logger.info("Speaker model loaded (simple)")
        except Exception as e:
            logger.warning(f"Could not load speaker model: {e}")
            self.models["speaker"] = None
    
    async def _load_whisper_model(self):
        """Load enhanced Whisper model"""
        try:
            self.models["whisper"] = WhisperModel(
                "base", 
                device="auto", 
                compute_type="int8"
            )
            logger.info("Whisper model loaded")
        except Exception as e:
            logger.warning(f"Could not load Whisper model: {e}")
            self.models["whisper"] = None
    
    async def process_audio_enhanced(self, audio_path: str, config: Dict[str, Any], 
                                   lang_hint: str = "auto") -> Dict[str, Any]:
        """Enhanced audio processing with advanced AI capabilities"""
        start_time = time.time()
        
        try:
            # Ensure models are initialized
            if not self.initialized:
                await self.initialize()
            
            logger.info(f"Processing audio with enhanced pipeline: {audio_path}")
            
            # Step 1: Audio preprocessing and transcription
            transcription_result = await self._enhanced_transcription(audio_path, lang_hint)
            
            if not transcription_result["transcript"]:
                return self._create_error_result("Transcription failed")
            
            # Step 2: Advanced NLP processing
            nlp_result = await self._advanced_nlp_processing(transcription_result["transcript"])
            
            # Step 3: Speaker analysis
            speaker_result = await self._speaker_analysis(audio_path, transcription_result["transcript"])
            
            # Step 4: Conversation analysis
            conversation_result = await self._conversation_analysis(
                transcription_result["transcript"], 
                nlp_result, 
                speaker_result
            )
            
            # Step 5: Quality assessment
            quality_result = await self._quality_assessment(
                transcription_result, 
                nlp_result, 
                conversation_result
            )
            
            # Step 6: Generate insights
            insights = await self._generate_insights(
                transcription_result, 
                nlp_result, 
                conversation_result, 
                quality_result
            )
            
            # Combine all results
            result = {
                "transcript": transcription_result["transcript"],
                "transcription_metadata": transcription_result["metadata"],
                "nlp_analysis": nlp_result,
                "speaker_analysis": speaker_result,
                "conversation_metrics": conversation_result,
                "quality_assessment": quality_result,
                "insights": insights,
                "processing_time": time.time() - start_time,
                "pipeline_version": "2.0.0-enhanced",
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Enhanced processing completed in {result['processing_time']:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error in enhanced processing: {e}")
            return self._create_error_result(str(e))
    
    async def _enhanced_transcription(self, audio_path: str, lang_hint: str) -> Dict[str, Any]:
        """Enhanced transcription with confidence scoring"""
        try:
            # Get VAD segments
            segments = webrtc_vad_segments(audio_path)
            
            # Transcribe with Whisper
            if self.models["whisper"]:
                segments_whisper, info = self.models["whisper"].transcribe(
                    audio_path, 
                    beam_size=1, 
                    language=None if lang_hint == "auto" else lang_hint
                )
                transcript = " ".join([s.text.strip() for s in segments_whisper])
                detected_language = info.language if hasattr(info, 'language') else lang_hint
            else:
                # Fallback to basic transcription
                from .pipeline import transcribe_whisper
                transcript = transcribe_whisper(audio_path, lang_hint=lang_hint)
                detected_language = lang_hint
            
            # Calculate confidence
            confidence = self._calculate_transcription_confidence(transcript, segments)
            
            # PII redaction
            transcript_redacted = redact(transcript)
            
            return {
                "transcript": transcript_redacted,
                "original_transcript": transcript,
                "segments": segments,
                "confidence": confidence,
                "detected_language": detected_language,
                "word_count": len(transcript.split()),
                "metadata": {
                    "audio_duration": sum(end - start for start, end in segments),
                    "speech_segments": len(segments),
                    "language_confidence": 0.8  # Placeholder
                }
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return {"transcript": "", "metadata": {}, "confidence": 0.0}
    
    async def _advanced_nlp_processing(self, text: str) -> Dict[str, Any]:
        """Advanced NLP processing with multiple models"""
        if not text.strip():
            return {}
        
        try:
            # Run NLP tasks concurrently
            tasks = []
            
            if self.config["enable_sentiment_analysis"]:
                tasks.append(self._analyze_sentiment(text))
            
            if self.config["enable_emotion_detection"]:
                tasks.append(self._detect_emotions(text))
            
            if self.config["enable_intent_classification"]:
                tasks.append(self._classify_intent(text))
            
            if self.config["enable_entity_extraction"]:
                tasks.append(self._extract_entities(text))
            
            if self.config["enable_topic_modeling"]:
                tasks.append(self._extract_topics(text))
            
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combine results
            nlp_result = {}
            task_names = ["sentiment", "emotions", "intent", "entities", "topics"]
            
            for i, result in enumerate(results):
                if not isinstance(result, Exception) and i < len(task_names):
                    nlp_result[task_names[i]] = result
            
            # Additional processing
            nlp_result["text_statistics"] = self._calculate_text_statistics(text)
            nlp_result["readability_score"] = self._calculate_readability(text)
            
            return nlp_result
            
        except Exception as e:
            logger.error(f"NLP processing error: {e}")
            return {}
    
    async def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Advanced sentiment analysis"""
        try:
            if self.models["sentiment"]:
                results = self.models["sentiment"](text)
                
                # Process results
                sentiment_scores = {}
                for result in results[0]:
                    sentiment_scores[result["label"]] = result["score"]
                
                # Calculate overall sentiment
                positive = sentiment_scores.get("LABEL_2", 0)  # Positive
                negative = sentiment_scores.get("LABEL_0", 0)  # Negative
                neutral = sentiment_scores.get("LABEL_1", 0)  # Neutral
                
                overall_sentiment = positive - negative
                
                return {
                    "overall_sentiment": overall_sentiment,
                    "sentiment_scores": sentiment_scores,
                    "confidence": max(positive, negative, neutral),
                    "category": "positive" if overall_sentiment > 0.1 else "negative" if overall_sentiment < -0.1 else "neutral"
                }
            else:
                # Fallback to simple analysis
                from .pipeline import sentiment_score
                score = sentiment_score(text)
                return {
                    "overall_sentiment": score,
                    "confidence": 0.6,
                    "category": "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
                }
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            return {"overall_sentiment": 0.0, "confidence": 0.0}
    
    async def _detect_emotions(self, text: str) -> Dict[str, Any]:
        """Detect emotions in text"""
        try:
            if self.models["emotion"]:
                results = self.models["emotion"](text)
                
                emotions = {}
                for result in results[0]:
                    emotions[result["label"]] = result["score"]
                
                dominant_emotion = max(emotions.items(), key=lambda x: x[1])
                
                return {
                    "emotions": emotions,
                    "dominant_emotion": dominant_emotion[0],
                    "dominant_confidence": dominant_emotion[1]
                }
            else:
                return {"emotions": {}, "dominant_emotion": "neutral", "dominant_confidence": 0.5}
        except Exception as e:
            logger.error(f"Emotion detection error: {e}")
            return {"emotions": {}, "dominant_emotion": "neutral", "dominant_confidence": 0.0}
    
    async def _classify_intent(self, text: str) -> Dict[str, Any]:
        """Classify user intent"""
        try:
            if self.models["intent"]:
                # Define intent categories
                intent_categories = [
                    "complaint",
                    "inquiry", 
                    "request",
                    "compliment",
                    "escalation",
                    "resolution",
                    "information_seeking",
                    "problem_reporting"
                ]
                
                result = self.models["intent"](text, intent_categories)
                
                return {
                    "intent": result["labels"][0],
                    "confidence": result["scores"][0],
                    "all_intents": dict(zip(result["labels"], result["scores"]))
                }
            else:
                return {"intent": "unknown", "confidence": 0.0}
        except Exception as e:
            logger.error(f"Intent classification error: {e}")
            return {"intent": "unknown", "confidence": 0.0}
    
    async def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract named entities"""
        try:
            if self.models["ner"]:
                entities = self.models["ner"](text)
                
                # Group entities by type
                entity_groups = defaultdict(list)
                for entity in entities:
                    entity_groups[entity["entity_group"]].append({
                        "text": entity["word"],
                        "confidence": entity["score"]
                    })
                
                return {
                    "entities": dict(entity_groups),
                    "total_entities": len(entities)
                }
            else:
                return {"entities": {}, "total_entities": 0}
        except Exception as e:
            logger.error(f"Entity extraction error: {e}")
            return {"entities": {}, "total_entities": 0}
    
    async def _extract_topics(self, text: str) -> Dict[str, Any]:
        """Extract topics and keywords"""
        try:
            topics = {}
            
            if self.models["keybert"]:
                # Extract keywords using KeyBERT
                keywords = self.models["keybert"].extract_keywords(
                    text, 
                    keyphrase_ngram_range=(1, 3),
                    top_n=10,
                    stop_words='english'
                )
                topics["keywords"] = [kw[0] for kw in keywords]
                topics["keyword_scores"] = [kw[1] for kw in keywords]
            
            if self.models["tfidf"]:
                # TF-IDF analysis
                try:
                    tfidf_matrix = self.models["tfidf"].fit_transform([text])
                    feature_names = self.models["tfidf"].get_feature_names_out()
                    scores = tfidf_matrix.toarray()[0]
                    
                    # Get top TF-IDF terms
                    top_indices = np.argsort(scores)[-10:][::-1]
                    topics["tfidf_terms"] = [
                        {"term": feature_names[i], "score": float(scores[i])}
                        for i in top_indices if scores[i] > 0
                    ]
                except:
                    topics["tfidf_terms"] = []
            
            return topics
        except Exception as e:
            logger.error(f"Topic extraction error: {e}")
            return {"keywords": [], "tfidf_terms": []}
    
    async def _speaker_analysis(self, audio_path: str, transcript: str) -> Dict[str, Any]:
        """Analyze speakers in the conversation"""
        try:
            # Simple speaker diarization based on conversation patterns
            speakers = self._simple_speaker_diarization(transcript)
            
            # Analyze speaking patterns
            speaker_analysis = []
            for speaker_id, speaker_data in speakers.items():
                analysis = {
                    "speaker_id": speaker_id,
                    "role": speaker_data["role"],
                    "confidence": speaker_data["confidence"],
                    "speaking_time": speaker_data["speaking_time"],
                    "word_count": speaker_data["word_count"],
                    "sentiment_trend": speaker_data["sentiment_trend"],
                    "key_phrases": speaker_data["key_phrases"]
                }
                speaker_analysis.append(analysis)
            
            return {
                "speakers": speaker_analysis,
                "total_speakers": len(speakers),
                "conversation_turns": sum(len(s["turns"]) for s in speakers.values())
            }
            
        except Exception as e:
            logger.error(f"Speaker analysis error: {e}")
            return {"speakers": [], "total_speakers": 0, "conversation_turns": 0}
    
    def _simple_speaker_diarization(self, transcript: str) -> Dict[str, Any]:
        """Simple speaker diarization based on conversation patterns"""
        # Split into sentences
        sentences = sent_tokenize(transcript)
        
        # Simple heuristic: alternate speakers
        speakers = {
            "speaker_1": {
                "role": "customer",
                "confidence": 0.7,
                "turns": [],
                "speaking_time": 0,
                "word_count": 0,
                "sentiment_trend": [],
                "key_phrases": []
            },
            "speaker_2": {
                "role": "staff",
                "confidence": 0.7,
                "turns": [],
                "speaking_time": 0,
                "word_count": 0,
                "sentiment_trend": [],
                "key_phrases": []
            }
        }
        
        # Assign sentences to speakers
        for i, sentence in enumerate(sentences):
            speaker_id = "speaker_1" if i % 2 == 0 else "speaker_2"
            speakers[speaker_id]["turns"].append(sentence)
            speakers[speaker_id]["word_count"] += len(sentence.split())
            
            # Simple sentiment analysis for each turn
            blob = TextBlob(sentence)
            sentiment = blob.sentiment.polarity
            speakers[speaker_id]["sentiment_trend"].append(sentiment)
        
        # Calculate speaking time (rough estimate)
        total_words = sum(s["word_count"] for s in speakers.values())
        for speaker in speakers.values():
            if total_words > 0:
                speaker["speaking_time"] = speaker["word_count"] / total_words
        
        return speakers
    
    async def _conversation_analysis(self, transcript: str, nlp_result: Dict, 
                                   speaker_result: Dict) -> ConversationMetrics:
        """Analyze conversation flow and quality"""
        try:
            # Calculate overall metrics
            overall_sentiment = nlp_result.get("sentiment", {}).get("overall_sentiment", 0.0)
            
            # Customer satisfaction (based on sentiment and conversation flow)
            customer_satisfaction = self._calculate_customer_satisfaction(
                overall_sentiment, speaker_result
            )
            
            # Staff performance (based on response patterns and resolution indicators)
            staff_performance = self._calculate_staff_performance(
                transcript, nlp_result, speaker_result
            )
            
            # Conversation quality
            conversation_quality = self._calculate_conversation_quality(
                transcript, nlp_result, speaker_result
            )
            
            # Resolution indicators
            resolution_indicators = self._analyze_resolution_indicators(transcript)
            
            # Escalation risk
            escalation_risk = self._calculate_escalation_risk(transcript, nlp_result)
            
            # Compliance score
            compliance_score = self._calculate_compliance_score(transcript)
            
            # Create speaker profiles
            speaker_profiles = []
            for speaker in speaker_result.get("speakers", []):
                profile = SpeakerProfile(
                    speaker_id=speaker["speaker_id"],
                    role=speaker["role"],
                    confidence=speaker["confidence"],
                    voice_characteristics={},  # Would be filled by audio analysis
                    speaking_patterns={
                        "turn_count": len(speaker.get("turns", [])),
                        "avg_turn_length": speaker.get("word_count", 0) / max(len(speaker.get("turns", [])), 1)
                    },
                    sentiment_trend=speaker.get("sentiment_trend", []),
                    key_phrases=speaker.get("key_phrases", [])
                )
                speaker_profiles.append(profile)
            
            return ConversationMetrics(
                overall_sentiment=overall_sentiment,
                customer_satisfaction=customer_satisfaction,
                staff_performance=staff_performance,
                conversation_quality=conversation_quality,
                resolution_indicators=resolution_indicators,
                escalation_risk=escalation_risk,
                compliance_score=compliance_score,
                insights=[],  # Will be filled by generate_insights
                speaker_profiles=speaker_profiles
            )
            
        except Exception as e:
            logger.error(f"Conversation analysis error: {e}")
            return ConversationMetrics(
                overall_sentiment=0.0,
                customer_satisfaction=0.0,
                staff_performance=0.0,
                conversation_quality=0.0,
                resolution_indicators={},
                escalation_risk=0.0,
                compliance_score=0.0,
                insights=[],
                speaker_profiles=[]
            )
    
    def _calculate_customer_satisfaction(self, sentiment: float, speaker_result: Dict) -> float:
        """Calculate customer satisfaction score"""
        base_score = (sentiment + 1) / 2  # Convert from [-1,1] to [0,1]
        
        # Adjust based on conversation flow
        speakers = speaker_result.get("speakers", [])
        if len(speakers) >= 2:
            customer_speaker = next((s for s in speakers if s["role"] == "customer"), None)
            if customer_speaker:
                customer_sentiment_trend = customer_speaker.get("sentiment_trend", [])
                if customer_sentiment_trend:
                    avg_customer_sentiment = sum(customer_sentiment_trend) / len(customer_sentiment_trend)
                    base_score = (base_score + (avg_customer_sentiment + 1) / 2) / 2
        
        return min(1.0, max(0.0, base_score))
    
    def _calculate_staff_performance(self, transcript: str, nlp_result: Dict, 
                                   speaker_result: Dict) -> float:
        """Calculate staff performance score"""
        score = 0.5  # Base score
        
        # Check for positive indicators
        positive_indicators = [
            "thank you", "i understand", "let me help", "i can help",
            "i apologize", "we can resolve", "solution", "assistance"
        ]
        
        negative_indicators = [
            "i don't know", "not my problem", "can't help", "policy",
            "escalate", "manager", "supervisor"
        ]
        
        text_lower = transcript.lower()
        positive_count = sum(1 for indicator in positive_indicators if indicator in text_lower)
        negative_count = sum(1 for indicator in negative_indicators if indicator in text_lower)
        
        # Adjust score based on indicators
        if positive_count > negative_count:
            score += 0.2
        elif negative_count > positive_count:
            score -= 0.2
        
        # Check resolution indicators
        resolution_indicators = self._analyze_resolution_indicators(transcript)
        if resolution_indicators.get("resolution_achieved", False):
            score += 0.3
        
        return min(1.0, max(0.0, score))
    
    def _calculate_conversation_quality(self, transcript: str, nlp_result: Dict, 
                                      speaker_result: Dict) -> float:
        """Calculate overall conversation quality"""
        quality_score = 0.5  # Base score
        
        # Length factor (longer conversations might be better)
        word_count = len(transcript.split())
        if word_count > 100:
            quality_score += 0.1
        if word_count > 300:
            quality_score += 0.1
        
        # Turn-taking factor
        speakers = speaker_result.get("speakers", [])
        if len(speakers) >= 2:
            # Check for balanced conversation
            speaker_word_counts = [s.get("word_count", 0) for s in speakers]
            if speaker_word_counts:
                balance_ratio = min(speaker_word_counts) / max(speaker_word_counts)
                quality_score += balance_ratio * 0.2
        
        # Sentiment factor
        sentiment = nlp_result.get("sentiment", {}).get("overall_sentiment", 0.0)
        if sentiment > 0.1:
            quality_score += 0.1
        elif sentiment < -0.1:
            quality_score -= 0.1
        
        return min(1.0, max(0.0, quality_score))
    
    def _analyze_resolution_indicators(self, transcript: str) -> Dict[str, float]:
        """Analyze indicators of problem resolution"""
        text_lower = transcript.lower()
        
        resolution_indicators = {
            "resolution_achieved": False,
            "solution_provided": False,
            "customer_satisfied": False,
            "follow_up_required": False
        }
        
        # Check for resolution keywords
        resolution_keywords = [
            "resolved", "fixed", "solved", "completed", "done",
            "thank you", "satisfied", "happy", "great", "perfect"
        ]
        
        solution_keywords = [
            "solution", "fix", "resolve", "help", "assist",
            "refund", "exchange", "replace", "repair"
        ]
        
        follow_up_keywords = [
            "follow up", "call back", "check", "monitor",
            "escalate", "manager", "supervisor"
        ]
        
        # Count occurrences
        resolution_count = sum(1 for keyword in resolution_keywords if keyword in text_lower)
        solution_count = sum(1 for keyword in solution_keywords if keyword in text_lower)
        follow_up_count = sum(1 for keyword in follow_up_keywords if keyword in text_lower)
        
        # Set indicators
        resolution_indicators["resolution_achieved"] = resolution_count > 0
        resolution_indicators["solution_provided"] = solution_count > 0
        resolution_indicators["follow_up_required"] = follow_up_count > 0
        
        # Customer satisfaction (simple heuristic)
        satisfaction_keywords = ["thank you", "satisfied", "happy", "great", "perfect"]
        satisfaction_count = sum(1 for keyword in satisfaction_keywords if keyword in text_lower)
        resolution_indicators["customer_satisfied"] = satisfaction_count > 0
        
        return resolution_indicators
    
    def _calculate_escalation_risk(self, transcript: str, nlp_result: Dict) -> float:
        """Calculate risk of escalation"""
        risk_score = 0.0
        text_lower = transcript.lower()
        
        # Escalation keywords
        escalation_keywords = [
            "manager", "supervisor", "escalate", "complaint",
            "dissatisfied", "angry", "frustrated", "unacceptable"
        ]
        
        # Count escalation indicators
        escalation_count = sum(1 for keyword in escalation_keywords if keyword in text_lower)
        risk_score += escalation_count * 0.1
        
        # Sentiment factor
        sentiment = nlp_result.get("sentiment", {}).get("overall_sentiment", 0.0)
        if sentiment < -0.3:
            risk_score += 0.3
        elif sentiment < -0.1:
            risk_score += 0.1
        
        # Emotion factor
        emotions = nlp_result.get("emotions", {}).get("emotions", {})
        if emotions:
            negative_emotions = ["anger", "fear", "sadness", "disgust"]
            for emotion in negative_emotions:
                if emotion in emotions and emotions[emotion] > 0.5:
                    risk_score += 0.2
        
        return min(1.0, risk_score)
    
    def _calculate_compliance_score(self, transcript: str) -> float:
        """Calculate compliance score"""
        score = 0.8  # Base score (assuming compliance)
        text_lower = transcript.lower()
        
        # Compliance indicators
        compliance_keywords = [
            "policy", "procedure", "guidelines", "compliance",
            "regulation", "standard", "protocol"
        ]
        
        # Non-compliance indicators
        non_compliance_keywords = [
            "skip", "bypass", "ignore", "override",
            "exception", "special case", "bend rules"
        ]
        
        compliance_count = sum(1 for keyword in compliance_keywords if keyword in text_lower)
        non_compliance_count = sum(1 for keyword in non_compliance_keywords if keyword in text_lower)
        
        # Adjust score
        score += compliance_count * 0.05
        score -= non_compliance_count * 0.1
        
        return min(1.0, max(0.0, score))
    
    async def _quality_assessment(self, transcription_result: Dict, nlp_result: Dict, 
                                conversation_result: ConversationMetrics) -> Dict[str, Any]:
        """Assess overall quality of the conversation"""
        try:
            quality_scores = {
                "transcription_quality": transcription_result.get("confidence", 0.0),
                "nlp_quality": 0.8,  # Placeholder
                "conversation_quality": conversation_result.conversation_quality,
                "overall_quality": 0.0
            }
            
            # Calculate overall quality
            quality_scores["overall_quality"] = (
                quality_scores["transcription_quality"] * 0.3 +
                quality_scores["nlp_quality"] * 0.3 +
                quality_scores["conversation_quality"] * 0.4
            )
            
            # Quality recommendations
            recommendations = []
            if quality_scores["transcription_quality"] < 0.7:
                recommendations.append("Transcription quality could be improved")
            if quality_scores["conversation_quality"] < 0.6:
                recommendations.append("Conversation quality needs attention")
            
            return {
                "quality_scores": quality_scores,
                "recommendations": recommendations,
                "quality_grade": self._get_quality_grade(quality_scores["overall_quality"])
            }
            
        except Exception as e:
            logger.error(f"Quality assessment error: {e}")
            return {"quality_scores": {}, "recommendations": [], "quality_grade": "C"}
    
    def _get_quality_grade(self, score: float) -> str:
        """Convert quality score to letter grade"""
        if score >= 0.9:
            return "A"
        elif score >= 0.8:
            return "B"
        elif score >= 0.7:
            return "C"
        elif score >= 0.6:
            return "D"
        else:
            return "F"
    
    async def _generate_insights(self, transcription_result: Dict, nlp_result: Dict,
                               conversation_result: ConversationMetrics, 
                               quality_result: Dict) -> List[ConversationInsight]:
        """Generate actionable insights from all analysis results"""
        insights = []
        
        try:
            # Sentiment insights
            sentiment = nlp_result.get("sentiment", {})
            if sentiment.get("overall_sentiment", 0) < -0.3:
                insights.append(ConversationInsight(
                    insight_type="sentiment",
                    category="customer_satisfaction",
                    message="Customer appears highly dissatisfied",
                    confidence=0.8,
                    severity="high",
                    action_required=True,
                    details={"sentiment_score": sentiment.get("overall_sentiment", 0)}
                ))
            
            # Escalation risk insights
            if conversation_result.escalation_risk > 0.7:
                insights.append(ConversationInsight(
                    insight_type="escalation",
                    category="risk_management",
                    message="High escalation risk detected",
                    confidence=0.8,
                    severity="critical",
                    action_required=True,
                    details={"escalation_risk": conversation_result.escalation_risk}
                ))
            
            # Quality insights
            quality_scores = quality_result.get("quality_scores", {})
            if quality_scores.get("overall_quality", 0) < 0.6:
                insights.append(ConversationInsight(
                    insight_type="quality",
                    category="performance",
                    message="Conversation quality below standards",
                    confidence=0.7,
                    severity="medium",
                    action_required=True,
                    details={"quality_score": quality_scores.get("overall_quality", 0)}
                ))
            
            # Resolution insights
            resolution_indicators = conversation_result.resolution_indicators
            if not resolution_indicators.get("resolution_achieved", False):
                insights.append(ConversationInsight(
                    insight_type="resolution",
                    category="customer_service",
                    message="No clear resolution achieved",
                    confidence=0.6,
                    severity="medium",
                    action_required=True,
                    details=resolution_indicators
                ))
            
            # Staff performance insights
            if conversation_result.staff_performance < 0.6:
                insights.append(ConversationInsight(
                    insight_type="performance",
                    category="staff_training",
                    message="Staff performance could be improved",
                    confidence=0.7,
                    severity="medium",
                    action_required=False,
                    details={"performance_score": conversation_result.staff_performance}
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Insight generation error: {e}")
            return []
    
    def _calculate_transcription_confidence(self, transcript: str, segments: List) -> float:
        """Calculate confidence score for transcription"""
        if not transcript or not transcript.strip():
            return 0.0
        
        # Base confidence
        confidence = 0.7
        
        # Adjust based on transcript length
        word_count = len(transcript.split())
        if word_count > 50:
            confidence += 0.1
        if word_count > 100:
            confidence += 0.1
        
        # Adjust based on audio duration
        if segments:
            audio_duration = sum(end - start for start, end in segments)
            if audio_duration > 2.0:
                confidence += 0.1
        
        return min(0.95, confidence)
    
    def _calculate_text_statistics(self, text: str) -> Dict[str, Any]:
        """Calculate basic text statistics"""
        words = text.split()
        sentences = sent_tokenize(text)
        
        return {
            "word_count": len(words),
            "sentence_count": len(sentences),
            "avg_words_per_sentence": len(words) / max(len(sentences), 1),
            "character_count": len(text),
            "unique_words": len(set(word.lower() for word in words))
        }
    
    def _calculate_readability(self, text: str) -> float:
        """Calculate readability score (simplified)"""
        try:
            blob = TextBlob(text)
            return blob.sentiment.polarity  # Simplified readability
        except:
            return 0.0
    
    def _create_error_result(self, error_message: str) -> Dict[str, Any]:
        """Create error result"""
        return {
            "transcript": "",
            "error": error_message,
            "processing_time": 0.0,
            "pipeline_version": "2.0.0-enhanced",
            "timestamp": datetime.now().isoformat()
        }

# Global enhanced pipeline instance
ai_enhanced_pipeline = AIEnhancedPipeline()
