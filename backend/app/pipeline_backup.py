import os, io, math, tempfile
from typing import Dict, List, Tuple
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

def load_whisper(size="base", device="auto"):
    global _whisper_model
    if _whisper_model is None:
        compute_type = "int8_float16" if device != "cuda" else "float16"
        _whisper_model = WhisperModel(size, device="auto", compute_type=compute_type)
    return _whisper_model

def load_summarizer():
    global _summary_pipe
    if _summary_pipe is None:
        try:
            _summary_pipe = hf_pipeline("summarization", model="facebook/bart-large-cnn")
        except Exception:
            _summary_pipe = None
    return _summary_pipe

def load_sentiment():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        _sentiment_pipe = hf_pipeline(
            "text-classification",
            model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
            top_k=None
        )
    return _sentiment_pipe

def load_keybert():
    global _kw_model
    if _kw_model is None:
        _kw_model = KeyBERT(SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"))
    return _kw_model

def webrtc_vad_segments(wav_path: str, sample_rate=16000, frame_ms=30) -> List[Tuple[float,float]]:
    audio, sr = sf.read(wav_path)
    if sr != sample_rate:
        # naive resample (librosa would be better)
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

def transcribe_whisper(wav_path: str, size="base", device="auto", lang_hint="auto") -> str:
    model = load_whisper(size=size, device=device)
    segments, info = model.transcribe(wav_path, beam_size=1, language=None if lang_hint=="auto" else lang_hint)
    text = " ".join([s.text.strip() for s in segments])
    return text.strip()

def summarize(text: str) -> str:
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

def keywords(text: str, top_k=8) -> List[str]:
    kw = load_keybert()
    try:
        pairs = kw.extract_keywords(text, keyphrase_ngram_range=(1,2), top_n=top_k, stop_words="english")
        return list(dict.fromkeys([p[0] for p in pairs]))
    except:
        return []

def sentiment_score(text: str) -> float:
    sp = load_sentiment()
    if not text.strip():
        return 0.0
    scores = sp(text[:1000])[0]  # returns list of dicts
    mapping = {"negative": -1.0, "neutral": 0.0, "positive": 1.0}
    return sum(mapping.get(s["label"].lower(),0) * s["score"] for s in scores)

def classify_buckets(text: str) -> Dict[str, Dict[str, float]]:
    # Simple keyword/rule starter; replace with ML later
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

def compute_metrics(buckets: Dict[str, Dict[str,float]], weights: Dict[str,int]) -> Dict[str,float]:
    rf = sum(weights.get(k,1) * v for k,v in buckets["redflags"].items())
    sentiment = 0.0  # computed separately usually
    handling_other = buckets["handling"].get("Other",0.0)
    return {
        "red_flag_score": rf,
        "handling_Other": handling_other*100.0
    }

def process_audio_to_packet(wav_path: str, cfg: Dict, lang_hint="auto") -> Dict:
    # VAD (seg list optional to show markers later)
    segs = webrtc_vad_segments(wav_path)
    # STT
    text = transcribe_whisper(wav_path, size=cfg["stt"]["size"], device=cfg["stt"]["device"], lang_hint=lang_hint)
    text = redact(text)
    # NLP
    summ = summarize(text)
    kws = keywords(text)
    sent = sentiment_score(text)
    buckets = classify_buckets(text)
    metrics = compute_metrics(buckets, cfg["weights_redflag"])
    metrics["sentiment"] = sent
    return {
        "transcript": text,
        "summary": summ,
        "keywords": kws,
        "buckets": buckets,
        "segments": segs,
        "metrics": metrics,
    }
