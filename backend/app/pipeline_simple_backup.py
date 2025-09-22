import os, io, math, tempfile
from typing import Dict, List, Tuple
import soundfile as sf
from .pii import redact

def webrtc_vad_segments(wav_path: str, sample_rate=16000, frame_ms=30) -> List[Tuple[float,float]]:
    try:
        audio, sr = sf.read(wav_path)
        if sr != sample_rate:
            # Simple resample - just return full audio as one segment
            return [(0.0, len(audio) / sr)]
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        # Return full audio as one segment for now
        return [(0.0, len(audio) / sr)]
    except Exception as e:
        print(f"VAD error: {e}")
        return [(0.0, 5.0)]  # Default 5 second segment

def transcribe_whisper(wav_path: str, size="base", device="auto", lang_hint="auto") -> str:
    try:
        # For now, return a mock transcription to test the system
        return "This is a test transcription. The customer called about their order and mentioned some issues with the product quality."
    except Exception as e:
        print(f"Transcription error: {e}")
        return "Error in transcription"

def summarize(text: str) -> str:
    try:
        if len(text) < 50:
            return text
        # Simple extractive summary - first and last sentences
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        if len(sentences) <= 2:
            return text
        return f"{sentences[0]}. {sentences[-1]}."
    except Exception as e:
        print(f"Summary error: {e}")
        return "Summary not available"

def keywords(text: str, top_k=8) -> List[str]:
    try:
        # Simple keyword extraction - just return some common words
        words = text.lower().split()
        # Filter out common words and return unique ones
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they"}
        keywords = [w for w in words if len(w) > 3 and w not in common_words]
        return list(dict.fromkeys(keywords))[:top_k]
    except Exception as e:
        print(f"Keywords error: {e}")
        return ["test", "audio", "conversation"]

def sentiment_score(text: str) -> float:
    try:
        # Simple sentiment analysis based on keywords
        positive_words = ["good", "great", "excellent", "happy", "satisfied", "love", "like", "perfect", "amazing", "wonderful"]
        negative_words = ["bad", "terrible", "awful", "hate", "angry", "frustrated", "disappointed", "poor", "worst", "horrible"]
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 0.5
        elif negative_count > positive_count:
            return -0.5
        else:
            return 0.0
    except Exception as e:
        print(f"Sentiment error: {e}")
        return 0.0

def classify_buckets(text: str) -> Dict[str, Dict[str, float]]:
    try:
        low = text.lower()
        objections = {
            "Price": 1.0 if any(w in low for w in ["price","expensive","costly","too much"]) else 0.0,
            "Stock": 1.0 if any(w in low for w in ["stock","out of stock","available","inventory"]) else 0.0,
            "SizeFit": 1.0 if any(w in low for w in ["size","fit","fitting"]) else 0.0,
            "Quality": 1.0 if any(w in low for w in ["quality","defect","damaged","broken"]) else 0.0,
            "Knowledge": 1.0 if any(w in low for w in ["don't know","not sure","confused"]) else 0.0,
            "Process": 1.0 if any(w in low for w in ["process","policy","return policy","exchange policy","billing"]) else 0.0,
        }
        handling = {
            "Solution": 1.0 if any(w in low for w in ["we can do","solution","offer","replace","refund","exchange"]) else 0.0,
            "Explanation": 1.0 if any(w in low for w in ["because","due to","the reason","explains"]) else 0.0,
            "Other": 1.0
        }
        redflags = {
            "Disrespect": 1.0 if any(w in low for w in ["shut up","nonsense","idiot"]) else 0.0,
            "Inventory": 1.0 if "out of stock" in low else 0.0,
            "Process": 1.0 if "skip bill" in low or "no receipt" in low else 0.0,
            "Knowledge": 1.0 if "don't know" in low else 0.0,
            "Team": 1.0 if "manager not available" in low else 0.0,
        }
        return {"objections": objections, "handling": handling, "redflags": redflags}
    except Exception as e:
        print(f"Classification error: {e}")
        return {
            "objections": {"Price": 0.0, "Stock": 0.0, "SizeFit": 0.0, "Quality": 0.0, "Knowledge": 0.0, "Process": 0.0},
            "handling": {"Solution": 0.0, "Explanation": 0.0, "Other": 1.0},
            "redflags": {"Disrespect": 0.0, "Inventory": 0.0, "Process": 0.0, "Knowledge": 0.0, "Team": 0.0}
        }

def compute_metrics(buckets: Dict[str, Dict[str,float]], weights: Dict[str,int]) -> Dict[str,float]:
    try:
        rf = sum(weights.get(k,1) * v for k,v in buckets["redflags"].items())
        handling_other = buckets["handling"].get("Other",0.0)
        return {
            "red_flag_score": rf,
            "handling_Other": handling_other*100.0
        }
    except Exception as e:
        print(f"Metrics error: {e}")
        return {"red_flag_score": 0.0, "handling_Other": 100.0}

def process_audio_to_packet(wav_path: str, cfg: Dict, lang_hint="auto") -> Dict:
    try:
        print(f"Processing audio: {wav_path}")
        
        # VAD
        segs = webrtc_vad_segments(wav_path)
        print(f"VAD segments: {segs}")
        
        # STT
        text = transcribe_whisper(wav_path, size=cfg["stt"]["size"], device=cfg["stt"]["device"], lang_hint=lang_hint)
        print(f"Transcription: {text}")
        
        # PII Redaction
        text = redact(text)
        print(f"After PII redaction: {text}")
        
        # NLP
        summ = summarize(text)
        kws = keywords(text)
        sent = sentiment_score(text)
        buckets = classify_buckets(text)
        metrics = compute_metrics(buckets, cfg["weights_redflag"])
        metrics["sentiment"] = sent
        
        print(f"Processing complete. Metrics: {metrics}")
        
        return {
            "transcript": text,
            "summary": summ,
            "keywords": kws,
            "buckets": buckets,
            "segments": segs,
            "metrics": metrics,
        }
    except Exception as e:
        print(f"Processing error: {e}")
        # Return default values on error
        return {
            "transcript": "Error processing audio",
            "summary": "Unable to process audio file",
            "keywords": ["error", "processing"],
            "buckets": {
                "objections": {"Price": 0.0, "Stock": 0.0, "SizeFit": 0.0, "Quality": 0.0, "Knowledge": 0.0, "Process": 0.0},
                "handling": {"Solution": 0.0, "Explanation": 0.0, "Other": 1.0},
                "redflags": {"Disrespect": 0.0, "Inventory": 0.0, "Process": 0.0, "Knowledge": 0.0, "Team": 0.0}
            },
            "segments": [(0.0, 5.0)],
            "metrics": {"red_flag_score": 0.0, "handling_Other": 100.0, "sentiment": 0.0},
        }
