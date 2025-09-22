import os, io, math, tempfile
from typing import Dict, List, Tuple, Optional
import signal
import time
import re
from faster_whisper import WhisperModel
from transformers import pipeline as hf_pipeline
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
import webrtcvad
import soundfile as sf
import numpy as np
from .pii import redact
from .voice_analysis import VoiceAnalyzer, IndianLanguageDetector, AdvancedInsightsGenerator

# Model cache (lazy loading)
_whisper_model = None
_summary_pipe = None
_sentiment_pipe = None
_kw_model = None
_translator_pipe = {}
_voice_analyzer = None
_language_detector = None
_insights_generator = None

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Operation timed out")

def load_whisper(size="base", device="auto"):
    global _whisper_model
    if _whisper_model is None:
        try:
            print(f"Loading Whisper model: {size}")
            compute_type = "int8" if device != "cuda" else "float16"
            _whisper_model = WhisperModel(size, device="auto", compute_type=compute_type)
            print("Whisper model loaded successfully")
        except Exception as e:
            print(f"Error loading Whisper: {e}")
            raise
    return _whisper_model

def load_voice_analyzer():
    global _voice_analyzer
    if _voice_analyzer is None:
        _voice_analyzer = VoiceAnalyzer()
    return _voice_analyzer

def load_language_detector():
    global _language_detector
    if _language_detector is None:
        _language_detector = IndianLanguageDetector()
    return _language_detector

def load_insights_generator():
    global _insights_generator
    if _insights_generator is None:
        _insights_generator = AdvancedInsightsGenerator()
    return _insights_generator

def load_summarizer():
    global _summary_pipe
    if _summary_pipe is None:
        try:
            print("Loading summarization model...")
            _summary_pipe = hf_pipeline("summarization", model="facebook/bart-large-cnn")
            print("Summarization model loaded successfully")
        except Exception as e:
            print(f"Error loading summarizer: {e}")
            _summary_pipe = None
    return _summary_pipe

def load_sentiment():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        try:
            print("Loading sentiment analysis model...")
            _sentiment_pipe = hf_pipeline(
                "text-classification", 
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                top_k=None
            )
            print("Sentiment model loaded successfully")
        except Exception as e:
            print(f"Error loading sentiment model: {e}")
            _sentiment_pipe = None
    return _sentiment_pipe

def load_keybert():
    global _kw_model
    if _kw_model is None:
        try:
            print("Loading KeyBERT model...")
            _kw_model = KeyBERT(SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"))
            print("KeyBERT model loaded successfully")
        except Exception as e:
            print(f"Error loading KeyBERT: {e}")
            _kw_model = None
    return _kw_model

def load_translator(model_name="Helsinki-NLP/opus-mt-en-hi"):
    global _translator_pipe
    if model_name not in _translator_pipe:
        try:
            print(f"Loading translation model: {model_name}...")
            _translator_pipe[model_name] = hf_pipeline("translation", model=model_name)
            print(f"Translation model {model_name} loaded successfully")
        except Exception as e:
            print(f"Error loading translator {model_name}: {e}")
            _translator_pipe[model_name] = None
    return _translator_pipe[model_name]

def webrtc_vad_segments(wav_path: str, sample_rate=16000, frame_ms=30) -> List[Tuple[float,float]]:
    """Enhanced VAD with better segment detection"""
    try:
        audio, sr = sf.read(wav_path)
        if sr != sample_rate:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)
            sr = sample_rate
        
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        
        pcm16 = (audio * 32767).astype("int16").tobytes()
        vad = webrtcvad.Vad(2)  # Aggressiveness level 2
        frame_len = int(sample_rate * frame_ms / 1000) * 2
        frames = [pcm16[i:i+frame_len] for i in range(0, len(pcm16), frame_len)]
        
        speech = []
        segs = []
        cur_start = None
        t = 0.0
        step = frame_ms / 1000.0
        
        for f in frames:
            is_speech = vad.is_speech(f, sample_rate)
            if is_speech and cur_start is None:
                cur_start = t
            if not is_speech and cur_start is not None:
                segs.append((cur_start, t))
                cur_start = None
            t += step
        
        if cur_start is not None:
            segs.append((cur_start, t))
        
        # Merge short gaps and filter very short segments
        merged = []
        for s, e in segs:
            if e - s < 0.5:  # Skip segments shorter than 500ms
                continue
            if merged and s - merged[-1][1] < 0.3:  # Merge gaps shorter than 300ms
                merged[-1] = (merged[-1][0], e)
            else:
                merged.append((s, e))
        
        return merged
    except Exception as e:
        print(f"Error in VAD: {e}")
        return []

def transcribe_whisper(wav_path: str, size="base", device="auto", lang_hint="auto") -> Tuple[str, str]:
    """Enhanced transcription with language detection"""
    try:
        model = load_whisper(size=size, device=device)
        
        # Use language hint if provided
        language = None if lang_hint == "auto" else lang_hint
        
        segments, info = model.transcribe(
            wav_path, 
            beam_size=1, 
            language=language,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        text = " ".join([s.text.strip() for s in segments])
        detected_language = info.language if hasattr(info, 'language') else lang_hint
        
        return text.strip(), detected_language
    except Exception as e:
        print(f"Error in transcription: {e}")
        return "", "en"

def detect_indian_language(text: str) -> Tuple[str, float]:
    """Detect Indian language from transcribed text"""
    detector = load_language_detector()
    return detector.detect_language(text)

def translate_text(text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
    """Enhanced translation with Indian language support"""
    if not text.strip():
        return ""
    
    # Map language codes to model names
    model_mapping = {
        'en-hi': 'Helsinki-NLP/opus-mt-en-hi',
        'hi-en': 'Helsinki-NLP/opus-mt-hi-en',
        'en-ta': 'Helsinki-NLP/opus-mt-en-ta',
        'ta-en': 'Helsinki-NLP/opus-mt-ta-en',
        'en-te': 'Helsinki-NLP/opus-mt-en-te',
        'te-en': 'Helsinki-NLP/opus-mt-te-en',
        'en-bn': 'Helsinki-NLP/opus-mt-en-bn',
        'bn-en': 'Helsinki-NLP/opus-mt-bn-en'
    }
    
    source_lang = source_lang or 'en'
    model_key = f"{source_lang}-{target_lang}"
    
    if model_key not in model_mapping:
        return f"Translation not available for {source_lang} to {target_lang}"
    
    translator = load_translator(model_mapping[model_key])
    if translator is None:
        return f"Translation model not available for {model_key}"
    
    try:
        out = translator(text, max_length=512)
        return out[0]["translation_text"]
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # Return original text if translation fails

def analyze_voice_characteristics(wav_path: str, segments: List[Tuple[float, float]]) -> List[Dict]:
    """Analyze voice characteristics for each segment"""
    analyzer = load_voice_analyzer()
    speaker_infos = analyzer.analyze_speaker_segments(wav_path, segments)
    
    return [
        {
            'speaker_id': info.speaker_id,
            'role': info.role,
            'language': info.language,
            'confidence': info.confidence,
            'voice_characteristics': {
                'pitch_mean': info.voice_characteristics.pitch_mean,
                'pitch_std': info.voice_characteristics.pitch_std,
                'energy_mean': info.voice_characteristics.energy_mean,
                'voice_type': info.voice_characteristics.voice_type,
                'speaking_rate': info.voice_characteristics.speaking_rate
            }
        }
        for info in speaker_infos
    ]

def generate_advanced_insights(transcript: str, sentiment: float, speaker_analysis: List[Dict], 
                             keywords: List[str], metrics: Dict) -> List[Dict]:
    """Generate intelligent insights from conversation analysis"""
    generator = load_insights_generator()
    
    # Convert speaker analysis to SpeakerInfo objects
    from .voice_analysis import SpeakerInfo, VoiceCharacteristics
    speaker_infos = []
    for sa in speaker_analysis:
        voice_chars = VoiceCharacteristics(
            pitch_mean=sa['voice_characteristics']['pitch_mean'],
            pitch_std=sa['voice_characteristics']['pitch_std'],
            energy_mean=sa['voice_characteristics']['energy_mean'],
            energy_std=0.0,  # Not available in simplified version
            spectral_centroid=0.0,
            mfcc_features=[],
            zero_crossing_rate=0.0,
            speaking_rate=sa['voice_characteristics']['speaking_rate'],
            voice_type=sa['voice_characteristics']['voice_type'],
            confidence=sa['confidence']
        )
        
        speaker_info = SpeakerInfo(
            speaker_id=sa['speaker_id'],
            voice_characteristics=voice_chars,
            role=sa['role'],
            language=sa['language'],
            confidence=sa['confidence']
        )
        speaker_infos.append(speaker_info)
    
    return generator.generate_insights(transcript, sentiment, speaker_infos, keywords, metrics)

def summarize(text: str) -> str:
    """Enhanced summarization with Indian language support"""
    sp = load_summarizer()
    if sp is None or len(text) < 200:
        # Fallback extractive summarization
        sents = [s.strip() for s in text.split(".") if s.strip()]
        if not sents:
            return ""
        pick = sents[:1] + sents[-1:]
        return ". ".join(pick)[:500]
    
    try:
        out = sp(text[:3000], max_length=128, min_length=40, do_sample=False)
        return out[0]["summary_text"]
    except Exception as e:
        print(f"Summarization error: {e}")
        return text[:200] + "..." if len(text) > 200 else text

def keywords(text: str, top_k=8) -> List[str]:
    """Enhanced keyword extraction"""
    kw = load_keybert()
    try:
        pairs = kw.extract_keywords(text, keyphrase_ngram_range=(1,2), top_n=top_k, stop_words="english")
        return list(dict.fromkeys([p[0] for p in pairs]))
    except Exception as e:
        print(f"Keyword extraction error: {e}")
        # Fallback: simple word frequency
        words = re.findall(r'\b\w+\b', text.lower())
        from collections import Counter
        return [word for word, count in Counter(words).most_common(top_k) if len(word) > 3]

def sentiment_score(text: str) -> float:
    """Enhanced sentiment analysis"""
    sp = load_sentiment()
    if not text.strip():
        return 0.0
    
    try:
        scores = sp(text[:1000])[0]
        mapping = {"negative": -1.0, "neutral": 0.0, "positive": 1.0}
        return sum(mapping.get(s["label"].lower(), 0) * s["score"] for s in scores)
    except Exception as e:
        print(f"Sentiment analysis error: {e}")
        return 0.0

def classify_buckets(text: str) -> Dict[str, Dict[str, float]]:
    """Enhanced classification with Indian context"""
    low = text.lower()
    
    # Enhanced objection detection with Indian context
    objections = {
        "Price": 1.0 if any(w in low for w in ["price", "expensive", "costly", "too much", "महंगा", "कीमत"]) else 0.0,
        "Stock": 1.0 if any(w in low for w in ["stock", "out of stock", "available", "inventory", "उपलब्ध", "स्टॉक"]) else 0.0,
        "SizeFit": 1.0 if any(w in low for w in ["size", "fit", "fitting", "साइज़", "फिट"]) else 0.0,
        "Quality": 1.0 if any(w in low for w in ["quality", "defect", "damaged", "broken", "गुणवत्ता", "खराब"]) else 0.0,
        "Knowledge": 1.0 if any(w in low for w in ["don't know", "not sure", "confused", "पता नहीं", "समझ नहीं आया"]) else 0.0,
        "Process": 1.0 if any(w in low for w in ["process", "policy", "return policy", "exchange policy", "billing", "प्रक्रिया", "नीति"]) else 0.0,
        "Language": 1.0 if any(w in low for w in ["language", "hindi", "english", "भाषा", "हिंदी", "अंग्रेजी"]) else 0.0,
    }
    
    handling = {
        "Solution": 1.0 if any(w in low for w in ["we can do", "solution", "offer", "replace", "refund", "exchange", "हल", "समाधान"]) else 0.0,
        "Explanation": 1.0 if any(w in low for w in ["because", "due to", "the reason", "explains", "कारण", "वजह"]) else 0.0,
        "Apology": 1.0 if any(w in low for w in ["sorry", "apologize", "regret", "माफ़ी", "खेद"]) else 0.0,
        "Other": 1.0
    }
    
    redflags = {
        "Disrespect": 1.0 if any(w in low for w in ["shut up", "nonsense", "idiot", "बकवास", "चुप रहो"]) else 0.0,
        "Inventory": 1.0 if "out of stock" in low else 0.0,
        "Process": 1.0 if any(w in low for w in ["skip bill", "no receipt", "बिना रसीद"]) else 0.0,
        "Knowledge": 1.0 if "don't know" in low else 0.0,
        "Team": 1.0 if "manager not available" in low else 0.0,
        "Language": 1.0 if any(w in low for w in ["language barrier", "don't understand", "भाषा की समस्या"]) else 0.0,
    }
    
    return {"objections": objections, "handling": handling, "redflags": redflags}

def compute_metrics(buckets: Dict[str, Dict[str,float]], weights: Dict[str,int]) -> Dict[str,float]:
    """Enhanced metrics computation"""
    rf = sum(weights.get(k,1) * v for k,v in buckets["redflags"].items())
    sentiment = 0.0  # Will be computed separately
    handling_other = buckets["handling"].get("Other",0.0)
    
    # Additional metrics
    total_objections = sum(buckets["objections"].values())
    total_handling = sum(v for k, v in buckets["handling"].items() if k != "Other")
    
    return {
        "red_flag_score": rf,
        "handling_Other": handling_other*100.0,
        "objection_count": total_objections,
        "handling_score": total_handling * 100.0,
        "interaction_quality": max(0, 100 - rf * 20)  # Quality score based on red flags
    }

def process_audio_to_packet(wav_path: str, cfg: Dict, lang_hint="auto") -> Dict:
    """Enhanced audio processing with voice analysis and Indian language support"""
    print(f"Processing audio: {wav_path}")
    
    # VAD segmentation
    segs = webrtc_vad_segments(wav_path)
    print(f"Found {len(segs)} speech segments")
    
    # Transcription with language detection
    text, detected_lang = transcribe_whisper(wav_path, 
                                           size=cfg["stt"]["size"], 
                                           device=cfg["stt"]["device"], 
                                           lang_hint=lang_hint)
    print(f"Transcribed text: {text[:100]}...")
    print(f"Detected language: {detected_lang}")
    
    # PII redaction
    text = redact(text)
    
    # Enhanced language detection for Indian languages
    if detected_lang == "en" and lang_hint == "auto":
        detected_lang, lang_confidence = detect_indian_language(text)
        print(f"Enhanced language detection: {detected_lang} (confidence: {lang_confidence})")
    
    # Voice analysis
    speaker_analysis = analyze_voice_characteristics(wav_path, segs)
    print(f"Analyzed {len(speaker_analysis)} speakers")
    
    # NLP processing
    summ = summarize(text)
    kws = keywords(text)
    sent = sentiment_score(text)
    buckets = classify_buckets(text)
    metrics = compute_metrics(buckets, cfg.get("weights_redflag", {}))
    metrics["sentiment"] = sent
    
    # Generate advanced insights
    insights = generate_advanced_insights(text, sent, speaker_analysis, kws, metrics)
    print(f"Generated {len(insights)} insights")
    
    # Translation support
    translations = {}
    if detected_lang != "en":
        try:
            translations["english"] = translate_text(text, "en", detected_lang)
        except Exception as e:
            print(f"Translation to English failed: {e}")
    
    return {
        "transcript": text,
        "summary": summ,
        "keywords": kws,
        "buckets": buckets,
        "segments": segs,
        "metrics": metrics,
        "speaker_analysis": speaker_analysis,
        "insights": insights,
        "detected_language": detected_lang,
        "translations": translations
    }
