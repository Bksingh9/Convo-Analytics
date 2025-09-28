import asyncio
import json
import time
import websockets
import base64
import io
import tempfile
import os
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import logging
from collections import defaultdict, deque
import threading
import queue

from .agents import agent_manager, Priority, Task
from .pipeline import transcribe_whisper, webrtc_vad_segments

logger = logging.getLogger(__name__)

@dataclass
class RealtimeSession:
    session_id: str
    interaction_id: str
    user_id: str
    store_id: str
    language_hint: str = "auto"
    started_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    audio_buffer: deque = field(default_factory=lambda: deque(maxlen=100))
    transcript_buffer: deque = field(default_factory=lambda: deque(maxlen=50))
    is_active: bool = True
    websocket: Optional[Any] = None
    processing_tasks: List[str] = field(default_factory=list)
    quality_metrics: Dict[str, float] = field(default_factory=dict)

class RealtimeProcessor:
    """Real-time audio processing and transcription system"""
    
    def __init__(self):
        self.sessions: Dict[str, RealtimeSession] = {}
        self.audio_processors: Dict[str, asyncio.Task] = {}
        self.websocket_connections: Dict[str, Any] = {}
        self.processing_queue = asyncio.Queue()
        self.result_queue = asyncio.Queue()
        self._running = False
        self._processing_tasks: List[asyncio.Task] = []
        
        # Configuration
        self.config = {
            "chunk_duration_ms": 500,  # Process every 500ms
            "buffer_size_seconds": 5,  # Keep 5 seconds of audio
            "min_chunks_for_processing": 4,  # Process when we have 2 seconds of audio
            "max_processing_delay": 2.0,  # Max 2 second delay
            "quality_threshold": 0.7,
            "enable_voice_activity_detection": True,
            "enable_speaker_diarization": False,
            "enable_sentiment_analysis": True,
            "enable_keyword_extraction": True
        }
    
    async def start(self):
        """Start the real-time processor"""
        logger.info("Starting real-time processor")
        self._running = True
        
        # Start processing workers
        for i in range(3):  # 3 processing workers
            task = asyncio.create_task(self._processing_worker(f"worker-{i}"))
            self._processing_tasks.append(task)
        
        # Start result handler
        result_task = asyncio.create_task(self._result_handler())
        self._processing_tasks.append(result_task)
        
        logger.info("Real-time processor started successfully")
    
    async def stop(self):
        """Stop the real-time processor"""
        logger.info("Stopping real-time processor")
        self._running = False
        
        # Cancel all processing tasks
        for task in self._processing_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        await asyncio.gather(*self._processing_tasks, return_exceptions=True)
        
        # Close all sessions
        for session in self.sessions.values():
            session.is_active = False
            if session.websocket:
                await session.websocket.close()
        
        logger.info("Real-time processor stopped")
    
    async def create_session(self, interaction_id: str, user_id: str, store_id: str, 
                           language_hint: str = "auto") -> str:
        """Create a new real-time session"""
        session_id = str(uuid.uuid4())
        
        session = RealtimeSession(
            session_id=session_id,
            interaction_id=interaction_id,
            user_id=user_id,
            store_id=store_id,
            language_hint=language_hint
        )
        
        self.sessions[session_id] = session
        logger.info(f"Created real-time session {session_id} for interaction {interaction_id}")
        
        return session_id
    
    async def add_audio_chunk(self, session_id: str, audio_data: bytes, 
                            timestamp: Optional[float] = None) -> bool:
        """Add audio chunk to a session"""
        if session_id not in self.sessions:
            logger.error(f"Session {session_id} not found")
            return False
        
        session = self.sessions[session_id]
        if not session.is_active:
            logger.warning(f"Session {session_id} is not active")
            return False
        
        # Add audio chunk to buffer
        chunk_data = {
            "data": audio_data,
            "timestamp": timestamp or time.time(),
            "size": len(audio_data)
        }
        
        session.audio_buffer.append(chunk_data)
        session.last_activity = datetime.now()
        
        # Check if we should trigger processing
        if len(session.audio_buffer) >= self.config["min_chunks_for_processing"]:
            await self._trigger_processing(session_id)
        
        return True
    
    async def _trigger_processing(self, session_id: str):
        """Trigger processing for a session"""
        session = self.sessions[session_id]
        
        # Combine recent audio chunks
        audio_chunks = list(session.audio_buffer)
        if not audio_chunks:
            return
        
        # Create processing task
        processing_data = {
            "session_id": session_id,
            "audio_chunks": audio_chunks,
            "language_hint": session.language_hint,
            "timestamp": time.time()
        }
        
        await self.processing_queue.put(processing_data)
    
    async def _processing_worker(self, worker_id: str):
        """Worker that processes audio chunks"""
        logger.info(f"Starting processing worker {worker_id}")
        
        while self._running:
            try:
                # Get processing data from queue
                processing_data = await asyncio.wait_for(
                    self.processing_queue.get(), 
                    timeout=1.0
                )
                
                session_id = processing_data["session_id"]
                audio_chunks = processing_data["audio_chunks"]
                language_hint = processing_data["language_hint"]
                
                # Process the audio
                result = await self._process_audio_chunks(
                    session_id, audio_chunks, language_hint
                )
                
                if result:
                    await self.result_queue.put(result)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in processing worker {worker_id}: {e}")
                await asyncio.sleep(0.1)
        
        logger.info(f"Processing worker {worker_id} stopped")
    
    async def _process_audio_chunks(self, session_id: str, audio_chunks: List[Dict], 
                                  language_hint: str) -> Optional[Dict[str, Any]]:
        """Process audio chunks and return results"""
        try:
            # Combine audio chunks
            combined_audio = b''.join(chunk["data"] for chunk in audio_chunks)
            
            if len(combined_audio) < 1000:  # Too small to process
                return None
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                tmp_file.write(combined_audio)
                tmp_path = tmp_file.name
            
            try:
                # Transcribe audio
                transcript = transcribe_whisper(
                    tmp_path, 
                    size="base", 
                    device="auto", 
                    lang_hint=language_hint
                )
                
                if not transcript or len(transcript.strip()) < 3:
                    return None
                
                # Get VAD segments
                segments = webrtc_vad_segments(tmp_path)
                
                # Calculate confidence
                confidence = self._calculate_confidence(transcript, segments)
                
                # Create result
                result = {
                    "session_id": session_id,
                    "transcript": transcript,
                    "confidence": confidence,
                    "segments": segments,
                    "timestamp": time.time(),
                    "is_partial": True,
                    "audio_duration": sum(chunk["size"] for chunk in audio_chunks) / 16000,  # Rough estimate
                    "word_count": len(transcript.split())
                }
                
                # Add analysis if enabled
                if self.config["enable_sentiment_analysis"]:
                    sentiment_result = await self._quick_sentiment_analysis(transcript)
                    result["sentiment"] = sentiment_result
                
                if self.config["enable_keyword_extraction"]:
                    keywords = await self._quick_keyword_extraction(transcript)
                    result["keywords"] = keywords
                
                return result
                
            finally:
                # Clean up temp file
                try:
                    os.unlink(tmp_path)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Error processing audio chunks for session {session_id}: {e}")
            return None
    
    async def _quick_sentiment_analysis(self, text: str) -> Dict[str, Any]:
        """Quick sentiment analysis for real-time processing"""
        try:
            # Simple rule-based sentiment analysis for speed
            positive_words = ["good", "great", "excellent", "happy", "satisfied", "thank", "please"]
            negative_words = ["bad", "terrible", "awful", "angry", "frustrated", "disappointed", "problem"]
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                sentiment = 0.3
                category = "positive"
            elif negative_count > positive_count:
                sentiment = -0.3
                category = "negative"
            else:
                sentiment = 0.0
                category = "neutral"
            
            return {
                "score": sentiment,
                "category": category,
                "confidence": 0.6  # Lower confidence for quick analysis
            }
        except:
            return {"score": 0.0, "category": "neutral", "confidence": 0.0}
    
    async def _quick_keyword_extraction(self, text: str) -> List[str]:
        """Quick keyword extraction for real-time processing"""
        try:
            # Simple keyword extraction based on frequency
            words = text.lower().split()
            word_freq = {}
            
            for word in words:
                if len(word) > 3:  # Only words longer than 3 characters
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Get top 5 most frequent words
            keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
            return [word for word, freq in keywords]
        except:
            return []
    
    def _calculate_confidence(self, transcript: str, segments: List) -> float:
        """Calculate confidence score for real-time transcription"""
        if not transcript or not transcript.strip():
            return 0.0
        
        # Base confidence
        confidence = 0.7
        
        # Adjust based on transcript length
        word_count = len(transcript.split())
        if word_count > 10:
            confidence += 0.1
        if word_count > 20:
            confidence += 0.1
        
        # Adjust based on audio duration
        if segments:
            audio_duration = sum(end - start for start, end in segments)
            if audio_duration > 1.0:  # More than 1 second
                confidence += 0.1
        
        return min(0.95, confidence)
    
    async def _result_handler(self):
        """Handle processing results and send to clients"""
        logger.info("Starting result handler")
        
        while self._running:
            try:
                # Get result from queue
                result = await asyncio.wait_for(
                    self.result_queue.get(), 
                    timeout=1.0
                )
                
                session_id = result["session_id"]
                
                if session_id in self.sessions:
                    session = self.sessions[session_id]
                    
                    # Add to transcript buffer
                    session.transcript_buffer.append(result)
                    
                    # Update quality metrics
                    self._update_session_metrics(session, result)
                    
                    # Send to websocket if connected
                    if session.websocket and not session.websocket.closed:
                        try:
                            await session.websocket.send(json.dumps({
                                "type": "transcript_update",
                                "data": result
                            }))
                        except Exception as e:
                            logger.error(f"Error sending to websocket: {e}")
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in result handler: {e}")
                await asyncio.sleep(0.1)
        
        logger.info("Result handler stopped")
    
    def _update_session_metrics(self, session: RealtimeSession, result: Dict[str, Any]):
        """Update session quality metrics"""
        if "quality_metrics" not in session.quality_metrics:
            session.quality_metrics = {
                "avg_confidence": 0.0,
                "total_chunks": 0,
                "avg_processing_time": 0.0,
                "total_words": 0
            }
        
        metrics = session.quality_metrics
        
        # Update confidence
        confidence = result.get("confidence", 0.0)
        total_chunks = metrics["total_chunks"]
        metrics["avg_confidence"] = (metrics["avg_confidence"] * total_chunks + confidence) / (total_chunks + 1)
        
        # Update word count
        word_count = result.get("word_count", 0)
        metrics["total_words"] += word_count
        
        # Update chunk count
        metrics["total_chunks"] += 1
    
    async def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a real-time session"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        
        return {
            "session_id": session_id,
            "interaction_id": session.interaction_id,
            "is_active": session.is_active,
            "started_at": session.started_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "audio_buffer_size": len(session.audio_buffer),
            "transcript_buffer_size": len(session.transcript_buffer),
            "quality_metrics": session.quality_metrics,
            "processing_tasks": len(session.processing_tasks)
        }
    
    async def get_session_transcript(self, session_id: str, limit: int = 50) -> Optional[List[Dict]]:
        """Get transcript history for a session"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        return list(session.transcript_buffer)[-limit:]
    
    async def end_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """End a real-time session and return final results"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        session.is_active = False
        
        # Process any remaining audio
        if session.audio_buffer:
            await self._trigger_processing(session_id)
            # Wait a bit for processing to complete
            await asyncio.sleep(1.0)
        
        # Generate final transcript
        final_transcript = " ".join(
            chunk["transcript"] for chunk in session.transcript_buffer
        )
        
        # Calculate final metrics
        final_metrics = {
            "total_duration": (datetime.now() - session.started_at).total_seconds(),
            "total_chunks_processed": len(session.transcript_buffer),
            "total_words": sum(chunk.get("word_count", 0) for chunk in session.transcript_buffer),
            "avg_confidence": session.quality_metrics.get("avg_confidence", 0.0),
            "final_transcript": final_transcript
        }
        
        # Clean up
        if session.websocket:
            await session.websocket.close()
        
        del self.sessions[session_id]
        
        logger.info(f"Ended session {session_id}")
        return final_metrics

# Global real-time processor instance
realtime_processor = RealtimeProcessor()
