import os, io, math, tempfile
from typing import Dict, List, Tuple
import signal
import time
from faster_whisper import WhisperModel
from transformers import pipeline as hf_pipeline
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
import webrtcvad
import soundfile as sf
from .pii import redact

# STT model cache (lazy)
_whisper_model = None
_summary_pipe = None
_sentiment_pipe = None
_kw_model = None

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
            print(f"Error loading sentiment model: {e}")
            raise
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
            raise
    return _kw_model

def webrtc_vad_segments(wav_path: str, sample_rate=16000, frame_ms=30) -> List[Tuple[float,float]]:
    try:
        print(f"Processing VAD for: {wav_path}")
        audio, sr = sf.read(wav_path)
        if sr != sample_rate:
            # Use librosa for proper resampling
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)
            sr = sample_rate
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        
        pcm16 = (audio * 32767).astype("int16").tobytes()
        vad = webrtcvad.Vad(2)
        frame_len = int(sample_rate * frame_ms / 1000) * 2
        frames = [pcm16[i:i+frame_len] for i in range(0, len(pcm16), frame_len)]
        
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
        
        # Merge short gaps
        merged = []
        for s,e in segs:
            if merged and s - merged[-1][1] < 0.2:  # 200ms gap
                merged[-1] = (merged[-1][0], e)
            else:
                merged.append((s,e))
        
        print(f"VAD found {len(merged)} segments")
        return merged
    except Exception as e:
        print(f"VAD error: {e}")
        return [(0.0, 5.0)]  # Default segment

def transcribe_whisper(wav_path: str, size="base", device="auto", lang_hint="auto") -> str:
    try:
        print(f"Starting transcription: {wav_path}")
        model = load_whisper(size=size, device=device)
        
        # Set timeout for transcription
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(60)  # 60 second timeout
        
        try:
            segments, info = model.transcribe(wav_path, beam_size=1, language=None if lang_hint=="auto" else lang_hint)
            text = " ".join([s.text.strip() for s in segments])
            signal.alarm(0)  # Cancel timeout
            print(f"Transcription completed: {len(text)} characters")
            return text.strip()
        except TimeoutError:
            print("Transcription timed out")
            return "Transcription timed out"
        finally:
            signal.alarm(0)  # Ensure timeout is cancelled
    except Exception as e:
        print(f"Transcription error: {e}")
        return f"Error in transcription: {str(e)}"

def summarize(text: str) -> str:
    try:
        if len(text) < 50:
            return text
        
        sp = load_summarizer()
        if sp is None:
            # Fallback extractive summary
            sentences = [s.strip() for s in text.split(".") if s.strip()]
            if len(sentences) <= 2:
                return text
            return f"{sentences[0]}. {sentences[-1]}."
        
        # Set timeout for summarization
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)  # 30 second timeout
        
        try:
            out = sp(text[:3000], max_length=128, min_length=40, do_sample=False)
            signal.alarm(0)
            return out[0]["summary_text"]
        except TimeoutError:
            print("Summarization timed out")
            # Fallback
            sentences = [s.strip() for s in text.split(".") if s.strip()]
            if len(sentences) <= 2:
                return text
            return f"{sentences[0]}. {sentences[-1]}."
        finally:
            signal.alarm(0)
    except Exception as e:
        print(f"Summary error: {e}")
        # Fallback extractive summary
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        if len(sentences) <= 2:
            return text
        return f"{sentences[0]}. {sentences[-1]}."

def keywords(text: str, top_k=8) -> List[str]:
    try:
        if len(text) < 20:
            return []
        
        print("Extracting keywords...")
        kw = load_keybert()
        
        # Set timeout for keyword extraction
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)  # 30 second timeout
        
        try:
            pairs = kw.extract_keywords(text, keyphrase_ngram_range=(1,2), top_n=top_k, stop_words="english")
            signal.alarm(0)
            keywords = list(dict.fromkeys([p[0] for p in pairs]))
            print(f"Extracted {len(keywords)} keywords")
            return keywords
        except TimeoutError:
            print("Keyword extraction timed out")
            # Fallback simple keyword extraction
            words = text.lower().split()
            common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they"}
            keywords = [w for w in words if len(w) > 3 and w not in common_words]
            return list(dict.fromkeys(keywords))[:top_k]
        finally:
            signal.alarm(0)
    except Exception as e:
        print(f"Keywords error: {e}")
        # Fallback simple keyword extraction
        words = text.lower().split()
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they"}
        keywords = [w for w in words if len(w) > 3 and w not in common_words]
        return list(dict.fromkeys(keywords))[:top_k]

def sentiment_score(text: str) -> float:
    try:
        if not text.strip():
            return 0.0
        
        print("Analyzing sentiment...")
        sp = load_sentiment()
        
        # Set timeout for sentiment analysis
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)  # 30 second timeout
        
        try:
            scores = sp(text[:1000])[0]  # returns list of dicts
            signal.alarm(0)
            mapping = {"negative": -1.0, "neutral": 0.0, "positive": 1.0}
            sentiment = sum(mapping.get(s["label"].lower(),0) * s["score"] for s in scores)
            print(f"Sentiment score: {sentiment}")
            return sentiment
        except TimeoutError:
            print("Sentiment analysis timed out")
            # Fallback simple sentiment
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
        finally:
            signal.alarm(0)
    except Exception as e:
        print(f"Sentiment error: {e}")
        # Fallback simple sentiment
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
        print(f"Starting audio processing: {wav_path}")
        start_time = time.time()
        
        # VAD
        print("Step 1: Voice Activity Detection")
        segs = webrtc_vad_segments(wav_path)
        
        # STT
        print("Step 2: Speech-to-Text")
        text = transcribe_whisper(wav_path, size=cfg["stt"]["size"], device=cfg["stt"]["device"], lang_hint=lang_hint)
        
        # PII Redaction
        print("Step 3: PII Redaction")
        text = redact(text)
        
        # NLP
        print("Step 4: Natural Language Processing")
        summ = summarize(text)
        kws = keywords(text)
        sent = sentiment_score(text)
        buckets = classify_buckets(text)
        metrics = compute_metrics(buckets, cfg["weights_redflag"])
        metrics["sentiment"] = sent
        
        processing_time = time.time() - start_time
        print(f"Processing completed in {processing_time:.2f} seconds")
        
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
            "transcript": f"Error processing audio: {str(e)}",
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
