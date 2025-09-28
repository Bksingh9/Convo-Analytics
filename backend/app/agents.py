import asyncio
import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable, Union
from enum import Enum
import logging
from datetime import datetime
import uuid
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentStatus(Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    ERROR = "error"
    COMPLETED = "completed"

class Priority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class Task:
    id: str
    agent_type: str
    data: Dict[str, Any]
    priority: Priority = Priority.MEDIUM
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: AgentStatus = AgentStatus.IDLE
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentConfig:
    name: str
    max_concurrent_tasks: int = 5
    timeout_seconds: int = 300
    retry_delay: float = 1.0
    enable_quality_control: bool = True
    enable_real_time: bool = True
    confidence_threshold: float = 0.7

class BaseAgent(ABC):
    """Base class for all AI agents in the system"""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.status = AgentStatus.IDLE
        self.active_tasks: Dict[str, Task] = {}
        self.task_queue: List[Task] = []
        self.completed_tasks: List[Task] = []
        self.quality_metrics: Dict[str, float] = {}
        self._shutdown = False
        
    @abstractmethod
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process a single task - must be implemented by subclasses"""
        pass
    
    @abstractmethod
    def validate_input(self, data: Dict[str, Any]) -> bool:
        """Validate input data for the agent"""
        pass
    
    async def add_task(self, data: Dict[str, Any], priority: Priority = Priority.MEDIUM, 
                      metadata: Dict[str, Any] = None) -> str:
        """Add a new task to the agent's queue"""
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            agent_type=self.config.name,
            data=data,
            priority=priority,
            metadata=metadata or {}
        )
        
        if not self.validate_input(data):
            task.status = AgentStatus.ERROR
            task.error = "Invalid input data"
            return task_id
        
        # Insert task based on priority
        inserted = False
        for i, existing_task in enumerate(self.task_queue):
            if priority.value > existing_task.priority.value:
                self.task_queue.insert(i, task)
                inserted = True
                break
        
        if not inserted:
            self.task_queue.append(task)
        
        logger.info(f"Added task {task_id} to {self.config.name} agent queue")
        return task_id
    
    async def start(self):
        """Start the agent's processing loop"""
        logger.info(f"Starting {self.config.name} agent")
        self.status = AgentStatus.IDLE
        
        while not self._shutdown:
            try:
                # Process tasks if we have capacity
                if len(self.active_tasks) < self.config.max_concurrent_tasks and self.task_queue:
                    task = self.task_queue.pop(0)
                    await self._execute_task(task)
                
                # Check for completed tasks
                await self._check_completed_tasks()
                
                await asyncio.sleep(0.1)  # Small delay to prevent busy waiting
                
            except Exception as e:
                logger.error(f"Error in {self.config.name} agent loop: {e}")
                await asyncio.sleep(1)
    
    async def _execute_task(self, task: Task):
        """Execute a task with proper error handling and quality control"""
        task.status = AgentStatus.PROCESSING
        task.started_at = datetime.now()
        self.active_tasks[task.id] = task
        
        try:
            # Process the task
            result = await asyncio.wait_for(
                self.process_task(task), 
                timeout=self.config.timeout_seconds
            )
            
            # Quality control check
            if self.config.enable_quality_control:
                quality_score = await self._assess_quality(result, task)
                result["quality_score"] = quality_score
                
                if quality_score < self.config.confidence_threshold:
                    logger.warning(f"Low quality result for task {task.id}: {quality_score}")
                    result["quality_warning"] = True
            
            task.result = result
            task.status = AgentStatus.COMPLETED
            task.completed_at = datetime.now()
            
            # Update quality metrics
            self._update_quality_metrics(result)
            
        except asyncio.TimeoutError:
            task.error = "Task timeout"
            task.status = AgentStatus.ERROR
            logger.error(f"Task {task.id} timed out")
            
        except Exception as e:
            task.error = str(e)
            task.status = AgentStatus.ERROR
            logger.error(f"Error processing task {task.id}: {e}")
            
            # Retry logic
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = AgentStatus.IDLE
                task.started_at = None
                task.error = None
                # Re-queue with lower priority
                task.priority = Priority(max(1, task.priority.value - 1))
                self.task_queue.append(task)
                logger.info(f"Retrying task {task.id} (attempt {task.retry_count})")
                return
        
        finally:
            if task.id in self.active_tasks:
                del self.active_tasks[task.id]
    
    async def _assess_quality(self, result: Dict[str, Any], task: Task) -> float:
        """Assess the quality of the processing result"""
        # Base implementation - can be overridden by subclasses
        quality_score = 0.8  # Default score
        
        # Check for common quality indicators
        if "confidence" in result:
            quality_score = result["confidence"]
        elif "accuracy" in result:
            quality_score = result["accuracy"]
        
        return min(1.0, max(0.0, quality_score))
    
    def _update_quality_metrics(self, result: Dict[str, Any]):
        """Update internal quality metrics"""
        if "quality_score" in result:
            score = result["quality_score"]
            if "avg_quality" not in self.quality_metrics:
                self.quality_metrics["avg_quality"] = score
                self.quality_metrics["count"] = 1
            else:
                count = self.quality_metrics["count"]
                avg = self.quality_metrics["avg_quality"]
                self.quality_metrics["avg_quality"] = (avg * count + score) / (count + 1)
                self.quality_metrics["count"] = count + 1
    
    async def _check_completed_tasks(self):
        """Move completed tasks to completed list"""
        completed_ids = []
        for task_id, task in self.active_tasks.items():
            if task.status in [AgentStatus.COMPLETED, AgentStatus.ERROR]:
                self.completed_tasks.append(task)
                completed_ids.append(task_id)
        
        for task_id in completed_ids:
            del self.active_tasks[task_id]
    
    async def get_task_status(self, task_id: str) -> Optional[Task]:
        """Get the status of a specific task"""
        # Check active tasks
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]
        
        # Check completed tasks
        for task in self.completed_tasks:
            if task.id == task_id:
                return task
        
        # Check queue
        for task in self.task_queue:
            if task.id == task_id:
                return task
        
        return None
    
    async def shutdown(self):
        """Gracefully shutdown the agent"""
        logger.info(f"Shutting down {self.config.name} agent")
        self._shutdown = True
        
        # Wait for active tasks to complete
        while self.active_tasks:
            await asyncio.sleep(0.1)
        
        self.status = AgentStatus.IDLE

class TranscriptionAgent(BaseAgent):
    """Specialized agent for audio transcription with real-time capabilities"""
    
    def __init__(self, config: AgentConfig = None):
        if config is None:
            config = AgentConfig(
                name="transcription",
                max_concurrent_tasks=3,
                timeout_seconds=120,
                confidence_threshold=0.8
            )
        super().__init__(config)
        self._whisper_model = None
        self._realtime_buffer = {}
    
    def validate_input(self, data: Dict[str, Any]) -> bool:
        required_fields = ["audio_path"]
        return all(field in data for field in required_fields)
    
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process audio transcription task"""
        audio_path = task.data["audio_path"]
        language_hint = task.data.get("language_hint", "auto")
        realtime = task.data.get("realtime", False)
        
        if realtime:
            return await self._process_realtime(task)
        else:
            return await self._process_batch(task)
    
    async def _process_batch(self, task: Task) -> Dict[str, Any]:
        """Process batch audio transcription"""
        from .pipeline import transcribe_whisper, webrtc_vad_segments
        
        audio_path = task.data["audio_path"]
        language_hint = task.data.get("language_hint", "auto")
        
        # Get VAD segments
        segments = webrtc_vad_segments(audio_path)
        
        # Transcribe
        transcript = transcribe_whisper(
            audio_path, 
            size="base", 
            device="auto", 
            lang_hint=language_hint
        )
        
        # Calculate confidence based on transcript quality
        confidence = self._calculate_transcription_confidence(transcript, segments)
        
        return {
            "transcript": transcript,
            "segments": segments,
            "confidence": confidence,
            "language_detected": language_hint,
            "processing_time": (datetime.now() - task.started_at).total_seconds(),
            "word_count": len(transcript.split()) if transcript else 0
        }
    
    async def _process_realtime(self, task: Task) -> Dict[str, Any]:
        """Process real-time audio transcription"""
        interaction_id = task.data.get("interaction_id")
        audio_chunk = task.data.get("audio_chunk")
        
        if not interaction_id or not audio_chunk:
            raise ValueError("Real-time processing requires interaction_id and audio_chunk")
        
        # Initialize buffer for this interaction
        if interaction_id not in self._realtime_buffer:
            self._realtime_buffer[interaction_id] = {
                "chunks": [],
                "last_transcript": "",
                "last_update": datetime.now()
            }
        
        buffer = self._realtime_buffer[interaction_id]
        buffer["chunks"].append(audio_chunk)
        
        # Process every 2 seconds of audio or when we have enough chunks
        if len(buffer["chunks"]) >= 4:  # Assuming 0.5s chunks
            # Combine chunks and transcribe
            combined_audio = b''.join(buffer["chunks"])
            
            # Save temporary file
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                tmp_file.write(combined_audio)
                tmp_path = tmp_file.name
            
            try:
                from .pipeline import transcribe_whisper
                transcript = transcribe_whisper(tmp_path, size="base", device="auto")
                
                # Update buffer
                buffer["last_transcript"] = transcript
                buffer["last_update"] = datetime.now()
                buffer["chunks"] = []  # Clear processed chunks
                
                return {
                    "transcript": transcript,
                    "is_partial": True,
                    "interaction_id": interaction_id,
                    "confidence": 0.8,  # Real-time confidence is typically lower
                    "timestamp": datetime.now().isoformat()
                }
            finally:
                import os
                os.unlink(tmp_path)
        
        return {
            "transcript": buffer["last_transcript"],
            "is_partial": True,
            "interaction_id": interaction_id,
            "confidence": 0.6,
            "timestamp": datetime.now().isoformat()
        }
    
    def _calculate_transcription_confidence(self, transcript: str, segments: List) -> float:
        """Calculate confidence score for transcription"""
        if not transcript or not transcript.strip():
            return 0.0
        
        # Base confidence on transcript length vs audio duration
        word_count = len(transcript.split())
        audio_duration = sum(end - start for start, end in segments) if segments else 1.0
        
        # Expected words per second (rough estimate)
        expected_wps = 2.0
        expected_words = audio_duration * expected_wps
        
        if expected_words == 0:
            return 0.0
        
        # Confidence based on word density
        word_ratio = min(word_count / expected_words, 2.0)  # Cap at 2x
        confidence = min(0.9, max(0.1, word_ratio * 0.5))
        
        # Boost confidence for longer transcripts
        if word_count > 50:
            confidence = min(0.95, confidence + 0.1)
        
        return confidence

class AnalysisAgent(BaseAgent):
    """Specialized agent for conversation analysis and insights"""
    
    def __init__(self, config: AgentConfig = None):
        if config is None:
            config = AgentConfig(
                name="analysis",
                max_concurrent_tasks=5,
                timeout_seconds=60,
                confidence_threshold=0.7
            )
        super().__init__(config)
    
    def validate_input(self, data: Dict[str, Any]) -> bool:
        required_fields = ["transcript"]
        return all(field in data for field in required_fields)
    
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process conversation analysis task"""
        transcript = task.data["transcript"]
        analysis_type = task.data.get("analysis_type", "comprehensive")
        
        if analysis_type == "comprehensive":
            return await self._comprehensive_analysis(transcript, task)
        elif analysis_type == "sentiment":
            return await self._sentiment_analysis(transcript, task)
        elif analysis_type == "keywords":
            return await self._keyword_analysis(transcript, task)
        else:
            raise ValueError(f"Unknown analysis type: {analysis_type}")
    
    async def _comprehensive_analysis(self, transcript: str, task: Task) -> Dict[str, Any]:
        """Perform comprehensive conversation analysis"""
        from .pipeline import (
            summarize, keywords, sentiment_score, 
            classify_buckets, compute_metrics, analyze_conversation_flow
        )
        
        # Run all analysis components
        summary = summarize(transcript)
        extracted_keywords = keywords(transcript)
        sentiment = sentiment_score(transcript)
        buckets = classify_buckets(transcript)
        metrics = compute_metrics(buckets, {})
        conversation_flow = analyze_conversation_flow(transcript)
        
        # Generate insights
        insights = await self._generate_insights(transcript, sentiment, buckets, conversation_flow)
        
        # Calculate overall confidence
        confidence = self._calculate_analysis_confidence(transcript, sentiment, buckets)
        
        return {
            "summary": summary,
            "keywords": extracted_keywords,
            "sentiment": sentiment,
            "buckets": buckets,
            "metrics": metrics,
            "conversation_flow": conversation_flow,
            "insights": insights,
            "confidence": confidence,
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    async def _sentiment_analysis(self, transcript: str, task: Task) -> Dict[str, Any]:
        """Perform sentiment analysis only"""
        from .pipeline import sentiment_score
        
        sentiment = sentiment_score(transcript)
        
        # Determine sentiment category
        if sentiment > 0.2:
            category = "positive"
        elif sentiment < -0.2:
            category = "negative"
        else:
            category = "neutral"
        
        return {
            "sentiment_score": sentiment,
            "sentiment_category": category,
            "confidence": 0.8,
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    async def _keyword_analysis(self, transcript: str, task: Task) -> Dict[str, Any]:
        """Perform keyword extraction only"""
        from .pipeline import keywords
        
        extracted_keywords = keywords(transcript, top_k=10)
        
        return {
            "keywords": extracted_keywords,
            "keyword_count": len(extracted_keywords),
            "confidence": 0.85,
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    async def _generate_insights(self, transcript: str, sentiment: float, 
                               buckets: Dict, conversation_flow: Dict) -> List[Dict[str, Any]]:
        """Generate actionable insights from analysis"""
        insights = []
        
        # Sentiment insights
        if sentiment < -0.3:
            insights.append({
                "type": "sentiment",
                "category": "customer_satisfaction",
                "message": "Customer appears dissatisfied",
                "confidence": 0.8,
                "action_required": True,
                "details": f"Sentiment score: {sentiment:.2f}"
            })
        
        # Red flag insights
        red_flags = buckets.get("redflags", {})
        for flag_type, score in red_flags.items():
            if score > 0.5:
                insights.append({
                    "type": "red_flag",
                    "category": "service_quality",
                    "message": f"Potential {flag_type.lower()} issue detected",
                    "confidence": score,
                    "action_required": True,
                    "details": f"Red flag score: {score:.2f}"
                })
        
        # Conversation flow insights
        customer_ratio = conversation_flow.get("customer_ratio", 0)
        if customer_ratio > 0.7:
            insights.append({
                "type": "conversation_flow",
                "category": "staff_performance",
                "message": "Customer dominated conversation",
                "confidence": 0.7,
                "action_required": False,
                "details": f"Customer spoke {customer_ratio:.1%} of the time"
            })
        
        return insights
    
    def _calculate_analysis_confidence(self, transcript: str, sentiment: float, 
                                     buckets: Dict) -> float:
        """Calculate confidence score for analysis"""
        confidence = 0.7  # Base confidence
        
        # Boost confidence for longer transcripts
        word_count = len(transcript.split())
        if word_count > 100:
            confidence += 0.1
        if word_count > 500:
            confidence += 0.1
        
        # Boost confidence for clear sentiment
        if abs(sentiment) > 0.5:
            confidence += 0.1
        
        return min(0.95, confidence)

class QualityControlAgent(BaseAgent):
    """Specialized agent for quality control and validation"""
    
    def __init__(self, config: AgentConfig = None):
        if config is None:
            config = AgentConfig(
                name="quality_control",
                max_concurrent_tasks=10,
                timeout_seconds=30,
                confidence_threshold=0.8
            )
        super().__init__(config)
        self.quality_rules = self._load_quality_rules()
    
    def validate_input(self, data: Dict[str, Any]) -> bool:
        required_fields = ["transcript", "analysis_result"]
        return all(field in data for field in required_fields)
    
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process quality control task"""
        transcript = task.data["transcript"]
        analysis_result = task.data["analysis_result"]
        qc_type = task.data.get("qc_type", "comprehensive")
        
        if qc_type == "comprehensive":
            return await self._comprehensive_qc(transcript, analysis_result, task)
        elif qc_type == "transcription":
            return await self._transcription_qc(transcript, task)
        elif qc_type == "analysis":
            return await self._analysis_qc(analysis_result, task)
        else:
            raise ValueError(f"Unknown QC type: {qc_type}")
    
    async def _comprehensive_qc(self, transcript: str, analysis_result: Dict, task: Task) -> Dict[str, Any]:
        """Perform comprehensive quality control"""
        qc_results = {
            "transcription_quality": await self._transcription_qc(transcript, task),
            "analysis_quality": await self._analysis_qc(analysis_result, task),
            "overall_quality": 0.0,
            "quality_issues": [],
            "recommendations": []
        }
        
        # Calculate overall quality score
        trans_quality = qc_results["transcription_quality"]["quality_score"]
        analysis_quality = qc_results["analysis_quality"]["quality_score"]
        qc_results["overall_quality"] = (trans_quality + analysis_quality) / 2
        
        # Generate recommendations
        if qc_results["overall_quality"] < 0.7:
            qc_results["recommendations"].append("Consider manual review")
        
        if trans_quality < 0.6:
            qc_results["recommendations"].append("Transcription may need improvement")
        
        if analysis_quality < 0.6:
            qc_results["recommendations"].append("Analysis confidence is low")
        
        return qc_results
    
    async def _transcription_qc(self, transcript: str, task: Task) -> Dict[str, Any]:
        """Quality control for transcription"""
        issues = []
        quality_score = 0.8
        
        # Check transcript length
        if not transcript or len(transcript.strip()) < 10:
            issues.append("Transcript too short")
            quality_score -= 0.3
        
        # Check for transcription errors (common patterns)
        error_patterns = [
            r'\[.*?\]',  # Bracketed text often indicates uncertainty
            r'\(.*?\)',  # Parentheses often indicate uncertainty
            r'\.{3,}',   # Multiple dots often indicate gaps
        ]
        
        for pattern in error_patterns:
            if re.search(pattern, transcript):
                issues.append(f"Potential transcription uncertainty: {pattern}")
                quality_score -= 0.1
        
        # Check word density
        words = transcript.split()
        if len(words) > 0:
            avg_word_length = sum(len(word) for word in words) / len(words)
            if avg_word_length < 2:
                issues.append("Unusually short words detected")
                quality_score -= 0.2
        
        return {
            "quality_score": max(0.0, quality_score),
            "issues": issues,
            "word_count": len(words),
            "character_count": len(transcript)
        }
    
    async def _analysis_qc(self, analysis_result: Dict, task: Task) -> Dict[str, Any]:
        """Quality control for analysis results"""
        issues = []
        quality_score = 0.8
        
        # Check required fields
        required_fields = ["sentiment", "keywords", "summary"]
        for field in required_fields:
            if field not in analysis_result:
                issues.append(f"Missing {field} in analysis")
                quality_score -= 0.2
        
        # Check sentiment validity
        if "sentiment" in analysis_result:
            sentiment = analysis_result["sentiment"]
            if not isinstance(sentiment, (int, float)) or sentiment < -1 or sentiment > 1:
                issues.append("Invalid sentiment score")
                quality_score -= 0.3
        
        # Check keywords quality
        if "keywords" in analysis_result:
            keywords = analysis_result["keywords"]
            if not isinstance(keywords, list) or len(keywords) == 0:
                issues.append("No keywords extracted")
                quality_score -= 0.2
        
        return {
            "quality_score": max(0.0, quality_score),
            "issues": issues,
            "fields_present": list(analysis_result.keys())
        }
    
    def _load_quality_rules(self) -> Dict[str, Any]:
        """Load quality control rules"""
        return {
            "transcription": {
                "min_length": 10,
                "max_uncertainty_ratio": 0.1,
                "min_word_density": 1.0
            },
            "analysis": {
                "min_confidence": 0.6,
                "required_fields": ["sentiment", "keywords", "summary"],
                "max_processing_time": 60
            }
        }

class AgentManager:
    """Manages all agents and coordinates task distribution"""
    
    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.task_routing: Dict[str, str] = {}
        self.global_metrics: Dict[str, Any] = {}
        self._running = False
    
    async def initialize_agents(self):
        """Initialize all agents"""
        # Create agent configurations
        transcription_config = AgentConfig(
            name="transcription",
            max_concurrent_tasks=3,
            timeout_seconds=120,
            confidence_threshold=0.8
        )
        
        analysis_config = AgentConfig(
            name="analysis",
            max_concurrent_tasks=5,
            timeout_seconds=60,
            confidence_threshold=0.7
        )
        
        qc_config = AgentConfig(
            name="quality_control",
            max_concurrent_tasks=10,
            timeout_seconds=30,
            confidence_threshold=0.8
        )
        
        # Create agents
        self.agents["transcription"] = TranscriptionAgent(transcription_config)
        self.agents["analysis"] = AnalysisAgent(analysis_config)
        self.agents["quality_control"] = QualityControlAgent(qc_config)
        
        # Set up task routing
        self.task_routing = {
            "transcribe": "transcription",
            "analyze": "analysis",
            "quality_check": "quality_control"
        }
        
        logger.info("All agents initialized successfully")
    
    async def start_all_agents(self):
        """Start all agents"""
        self._running = True
        
        # Start all agents concurrently
        tasks = []
        for agent in self.agents.values():
            tasks.append(asyncio.create_task(agent.start()))
        
        logger.info("All agents started")
        return tasks
    
    async def submit_task(self, task_type: str, data: Dict[str, Any], 
                         priority: Priority = Priority.MEDIUM,
                         metadata: Dict[str, Any] = None) -> str:
        """Submit a task to the appropriate agent"""
        if task_type not in self.task_routing:
            raise ValueError(f"Unknown task type: {task_type}")
        
        agent_name = self.task_routing[task_type]
        agent = self.agents[agent_name]
        
        task_id = await agent.add_task(data, priority, metadata)
        
        # Update global metrics
        if "tasks_submitted" not in self.global_metrics:
            self.global_metrics["tasks_submitted"] = 0
        self.global_metrics["tasks_submitted"] += 1
        
        logger.info(f"Task {task_id} submitted to {agent_name} agent")
        return task_id
    
    async def get_task_status(self, task_id: str) -> Optional[Task]:
        """Get task status from any agent"""
        for agent in self.agents.values():
            task = await agent.get_task_status(task_id)
            if task:
                return task
        return None
    
    async def get_agent_status(self, agent_name: str = None) -> Dict[str, Any]:
        """Get status of specific agent or all agents"""
        if agent_name:
            if agent_name not in self.agents:
                raise ValueError(f"Unknown agent: {agent_name}")
            
            agent = self.agents[agent_name]
            return {
                "name": agent.config.name,
                "status": agent.status.value,
                "active_tasks": len(agent.active_tasks),
                "queued_tasks": len(agent.task_queue),
                "completed_tasks": len(agent.completed_tasks),
                "quality_metrics": agent.quality_metrics
            }
        else:
            return {
                name: await self.get_agent_status(name)
                for name in self.agents.keys()
            }
    
    async def shutdown_all_agents(self):
        """Shutdown all agents gracefully"""
        logger.info("Shutting down all agents")
        self._running = False
        
        shutdown_tasks = []
        for agent in self.agents.values():
            shutdown_tasks.append(asyncio.create_task(agent.shutdown()))
        
        await asyncio.gather(*shutdown_tasks, return_exceptions=True)
        logger.info("All agents shut down successfully")

# Global agent manager instance
agent_manager = AgentManager()
