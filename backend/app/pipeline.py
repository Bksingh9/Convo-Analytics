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
from .pii import redact

# Model cache (lazy loading)
_whisper_model = None
_summary_pipe = None
_sentiment_pipe = None
_kw_model = None
_translation_pipe = None

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
            print("Loading sentiment model...")
            _sentiment_pipe = hf_pipeline(
                "text-classification", 
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                top_k=None
            )
            print("Sentiment model loaded successfully")
        except Exception as e:
            print(f"Error loading sentiment: {e}")
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

def load_translator():
    global _translation_pipe
    if _translation_pipe is None:
        try:
            print("Loading translation model...")
            _translation_pipe = hf_pipeline("translation", model="Helsinki-NLP/opus-mt-en-hi")
            print("Translation model loaded successfully")
        except Exception as e:
            print(f"Error loading translator: {e}")
            _translation_pipe = None
    return _translation_pipe

def webrtc_vad_segments(wav_path: str, sample_rate=16000, frame_ms=30) -> List[Tuple[float,float]]:
    try:
        audio, sr = sf.read(wav_path)
        if sr != sample_rate:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)
            sr = sample_rate
        
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        
        pcm16 = (audio * 32767).astype("int16").tobytes()
        vad = webrtcvad.Vad(2)
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
        
        # merge short gaps
        merged = []
        for s,e in segs:
            if merged and s - merged[-1][1] < 0.2:  # 200ms gap
                merged[-1] = (merged[-1][0], e)
            else:
                merged.append((s,e))
        
        return merged
    except Exception as e:
        print(f"VAD error: {e}")
        return [(0.0, 2.0)]  # fallback

def transcribe_whisper(wav_path: str, size="base", device="auto", lang_hint="auto") -> str:
    try:
        model = load_whisper(size=size, device=device)
        segments, info = model.transcribe(wav_path, beam_size=1, language=None if lang_hint=="auto" else lang_hint)
        text = " ".join([s.text.strip() for s in segments])
        return text.strip()
    except Exception as e:
        print(f"Transcription error: {e}")
        return f"Error in transcription: {str(e)}"

def translate_text(text: str, target_lang: str = "hi") -> str:
    try:
        if not text.strip():
            return ""
        
        translator = load_translator()
        if translator is None:
            return text  # fallback to original
        
        # Simple language detection
        if target_lang == "hi" and re.search(r'[\u0900-\u097F]', text):
            return text  # already in Hindi
        
        result = translator(text[:500])  # limit length
        return result[0]["translation_text"]
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # fallback to original

def summarize(text: str) -> str:
    try:
        if not text.strip():
            return ""
        
        sp = load_summarizer()
        if sp is None or len(text) < 200:
            # fallback extractive: first/last sentences
            sents = [s.strip() for s in text.split(".") if s.strip()]
            if not sents:
                return ""
            pick = sents[:1] + sents[-1:]
            return ". ".join(pick)[:500]
        
        out = sp(text[:3000], max_length=128, min_length=40, do_sample=False)
        return out[0]["summary_text"]
    except Exception as e:
        print(f"Summarization error: {e}")
        return text[:200] + "..." if len(text) > 200 else text

def keywords(text: str, top_k=8) -> List[str]:
    try:
        if not text.strip():
            return []
        
        kw = load_keybert()
        if kw is None:
            # fallback: simple keyword extraction
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            from collections import Counter
            return [word for word, count in Counter(words).most_common(top_k)]
        
        pairs = kw.extract_keywords(text, keyphrase_ngram_range=(1,2), top_n=top_k, stop_words="english")
        return list(dict.fromkeys([p[0] for p in pairs]))
    except Exception as e:
        print(f"Keyword extraction error: {e}")
        return []

def sentiment_score(text: str) -> float:
    try:
        if not text.strip():
            return 0.0
        
        sp = load_sentiment()
        if sp is None:
            return 0.0
        
        scores = sp(text[:1000])[0]
        mapping = {"negative": -1.0, "neutral": 0.0, "positive": 1.0}
        return sum(mapping.get(s["label"].lower(),0) * s["score"] for s in scores)
    except Exception as e:
        print(f"Sentiment analysis error: {e}")
        return 0.0

def analyze_conversation_flow(text: str) -> Dict[str, any]:
    """Analyze conversation flow and identify speakers"""
    try:
        # Simple speaker identification based on patterns
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        customer_indicators = [
            'i want', 'i need', 'my order', 'refund', 'return', 'problem', 'issue',
            'complaint', 'dissatisfied', 'wrong', 'damaged', 'missing'
        ]
        
        staff_indicators = [
            'i understand', 'let me help', 'i can help', 'we can', 'our policy',
            'i apologize', 'thank you', 'is there anything else'
        ]
        
        customer_lines = 0
        staff_lines = 0
        
        for line in lines:
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in customer_indicators):
                customer_lines += 1
            elif any(indicator in line_lower for indicator in staff_indicators):
                staff_lines += 1
        
        total_lines = len(lines)
        return {
            "total_lines": total_lines,
            "customer_lines": customer_lines,
            "staff_lines": staff_lines,
            "customer_ratio": customer_lines / total_lines if total_lines > 0 else 0,
            "staff_ratio": staff_lines / total_lines if total_lines > 0 else 0
        }
    except Exception as e:
        print(f"Conversation flow analysis error: {e}")
        return {"total_lines": 0, "customer_lines": 0, "staff_lines": 0, "customer_ratio": 0, "staff_ratio": 0}

def classify_buckets(text: str) -> Dict[str, Dict[str, float]]:
    """Enhanced classification with more categories"""
    try:
        low = text.lower()
        
        # Objections
        objections = {
            "Price": 1.0 if any(w in low for w in ["price","expensive","costly","too much","cheap","budget"]) else 0.0,
            "Stock": 1.0 if any(w in low for w in ["stock","out of stock","available","inventory","sold out"]) else 0.0,
            "SizeFit": 1.0 if any(w in low for w in ["size","fit","fitting","small","large","tight","loose"]) else 0.0,
            "Quality": 1.0 if any(w in low for w in ["quality","defect","damaged","broken","poor","bad"]) else 0.0,
            "Knowledge": 1.0 if any(w in low for w in ["don't know","not sure","confused","unclear"]) else 0.0,
            "Process": 1.0 if any(w in low for w in ["process","policy","return policy","exchange policy","billing","payment"]) else 0.0,
            "Delivery": 1.0 if any(w in low for w in ["delivery","shipping","late","delay","tracking"]) else 0.0,
            "Support": 1.0 if any(w in low for w in ["support","help","assistance","service"]) else 0.0,
        }
        
        # Handling
        handling = {
            "Solution": 1.0 if any(w in low for w in ["we can do","solution","offer","replace","refund","exchange","fix"]) else 0.0,
            "Explanation": 1.0 if any(w in low for w in ["because","due to","the reason","explains","clarify"]) else 0.0,
            "Empathy": 1.0 if any(w in low for w in ["understand","sorry","apologize","feel","empathize"]) else 0.0,
            "Escalation": 1.0 if any(w in low for w in ["manager","supervisor","escalate","higher"]) else 0.0,
            "Other": 1.0
        }
        
        # Red flags
        redflags = {
            "Disrespect": 1.0 if any(w in low for w in ["shut up","nonsense","idiot","stupid","rude"]) else 0.0,
            "Inventory": 1.0 if "out of stock" in low else 0.0,
            "Process": 1.0 if any(w in low for w in ["skip bill","no receipt","bypass"]) else 0.0,
            "Knowledge": 1.0 if "don't know" in low else 0.0,
            "Team": 1.0 if "manager not available" in low else 0.0,
            "Escalation": 1.0 if any(w in low for w in ["escalate","manager","supervisor"]) else 0.0,
        }
        
        return {"objections": objections, "handling": handling, "redflags": redflags}
    except Exception as e:
        print(f"Classification error: {e}")
        return {"objections": {}, "handling": {}, "redflags": {}}

def compute_metrics(buckets: Dict[str, Dict[str,float]], weights: Dict[str,int]) -> Dict[str,float]:
    try:
        rf = sum(weights.get(k,1) * v for k,v in buckets["redflags"].items())
        sentiment = 0.0  # computed separately
        handling_other = buckets["handling"].get("Other",0.0)
        
        # Additional metrics
        total_objections = sum(buckets["objections"].values())
        total_handling = sum(buckets["handling"].values())
        handling_effectiveness = (total_handling - handling_other) / max(total_handling, 1)
        
        return {
            "red_flag_score": rf,
            "handling_Other": handling_other*100.0,
            "total_objections": total_objections,
            "total_handling": total_handling,
            "handling_effectiveness": handling_effectiveness * 100.0
        }
    except Exception as e:
        print(f"Metrics computation error: {e}")
        return {"red_flag_score": 0.0, "handling_Other": 100.0}

def process_audio_to_packet(wav_path: str, cfg: Dict, lang_hint="auto") -> Dict:
    """Enhanced audio processing with multilingual support"""
    try:
        print(f"Processing audio: {wav_path}")
        
        # VAD
        segs = webrtc_vad_segments(wav_path)
        print(f"VAD segments: {len(segs)}")
        
        # STT
        text = transcribe_whisper(wav_path, size=cfg["stt"]["size"], device=cfg["stt"]["device"], lang_hint=lang_hint)
        print(f"Transcription: {text[:100]}...")
        
        if not text.strip() or "Error in transcription" in text:
            return {
                "transcript": text,
                "summary": "Transcription failed",
                "keywords": [],
                "buckets": {"objections": {}, "handling": {}, "redflags": {}},
                "segments": segs,
                "metrics": {"red_flag_score": 0.0, "handling_Other": 100.0},
                "conversation_flow": {"total_lines": 0, "customer_lines": 0, "staff_lines": 0},
                "translations": {}
            }
        
        # PII Redaction
        text = redact(text)
        
        # NLP Processing
        summ = summarize(text)
        kws = keywords(text)
        sent = sentiment_score(text)
        buckets = classify_buckets(text)
        metrics = compute_metrics(buckets, cfg["weights_redflag"])
        metrics["sentiment"] = sent
        
        # Conversation Analysis
        conversation_flow = analyze_conversation_flow(text)
        
        # Translation
        translations = {}
        if lang_hint != "hi":
            translations["hi"] = translate_text(text, "hi")
        
        return {
            "transcript": text,
            "summary": summ,
            "keywords": kws,
            "buckets": buckets,
            "segments": segs,
            "metrics": metrics,
            "conversation_flow": conversation_flow,
            "translations": translations
        }
    except Exception as e:
        print(f"Audio processing error: {e}")
        return {
            "transcript": f"Processing error: {str(e)}",
            "summary": "Error in processing",
            "keywords": [],
            "buckets": {"objections": {}, "handling": {}, "redflags": {}},
            "segments": [(0.0, 2.0)],
            "metrics": {"red_flag_score": 0.0, "handling_Other": 100.0},
            "conversation_flow": {"total_lines": 0, "customer_lines": 0, "staff_lines": 0},
            "translations": {}
        }
