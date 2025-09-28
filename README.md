# Convo Analytics - AI-Powered Conversation Analytics Platform

A comprehensive conversation analytics platform with advanced AI capabilities, real-time processing, and agentic architecture for analyzing customer interactions across multiple languages.

## 🚀 Features

### Core Capabilities
- **Advanced Audio Transcription** - Powered by Whisper with confidence scoring
- **Multi-language Support** - English, Hindi, Tamil, Telugu, Bengali, Gujarati, and more
- **Real-time Processing** - Live audio streaming and transcription
- **AI-Powered Analysis** - Sentiment, emotion, intent, and entity recognition
- **Quality Control** - Automated quality assessment and validation
- **Speaker Diarization** - Identify and analyze different speakers
- **Conversation Insights** - Generate actionable insights and recommendations

### Agentic Architecture
- **Transcription Agent** - Specialized for audio-to-text conversion
- **Analysis Agent** - Handles NLP and conversation analysis
- **Quality Control Agent** - Validates and assesses processing quality
- **Agent Manager** - Coordinates task distribution and monitoring

### Real-time Features
- **WebSocket Support** - Live audio streaming and real-time updates
- **Live Transcription** - Real-time speech-to-text with confidence scoring
- **Instant Analysis** - Live sentiment and keyword extraction
- **Session Management** - Track and manage real-time processing sessions

### AI Enhancements
- **Advanced NLP Models** - BERT, RoBERTa, and transformer-based models
- **Emotion Detection** - Multi-emotion classification
- **Intent Classification** - Zero-shot intent recognition
- **Entity Extraction** - Named entity recognition
- **Topic Modeling** - KeyBERT and TF-IDF analysis
- **Conversation Quality Assessment** - AI-powered quality scoring

## 🏗️ Architecture

### Backend Components

#### 1. Agentic Layer (`agents.py`)
- **BaseAgent** - Abstract base class for all AI agents
- **TranscriptionAgent** - Handles audio transcription with real-time support
- **AnalysisAgent** - Performs comprehensive conversation analysis
- **QualityControlAgent** - Validates processing quality and generates recommendations
- **AgentManager** - Manages agent lifecycle and task distribution

#### 2. Real-time Processor (`realtime_processor.py`)
- **RealtimeProcessor** - Manages real-time audio processing sessions
- **WebSocket Integration** - Live communication with frontend
- **Audio Chunk Processing** - Handles streaming audio data
- **Session Management** - Tracks and manages processing sessions

#### 3. AI Enhanced Pipeline (`ai_enhanced_pipeline.py`)
- **AIEnhancedPipeline** - Advanced processing with multiple AI models
- **Multi-model Integration** - Sentiment, emotion, intent, entity, and topic models
- **Conversation Analysis** - Comprehensive conversation metrics
- **Insight Generation** - AI-powered actionable insights

#### 4. Enhanced API (`main.py`)
- **FastAPI Application** - RESTful API with WebSocket support
- **Real-time Endpoints** - Session management and live processing
- **Agent Management** - Monitor and control AI agents
- **Quality Assessment** - Automated quality control endpoints

### Frontend Components

#### 1. RealtimeAudioProcessor
- Real-time audio recording and processing
- WebSocket integration for live updates
- Session status monitoring
- Quality metrics display

#### 2. AIInsightsDashboard
- Comprehensive AI insights visualization
- Real-time metrics and analytics
- Speaker analysis and conversation flow
- Quality assessment and recommendations

#### 3. Enhanced Ingest Page
- Multiple processing modes (Basic, Enhanced, Real-time)
- AI analysis configuration
- Live transcription display
- Historical results management

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- FFmpeg (for audio processing)
- CUDA (optional, for GPU acceleration)

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Convo-Analytics
```

2. **Install Python dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Download AI models** (first run will download automatically)
```bash
python -c "from app.ai_enhanced_pipeline import ai_enhanced_pipeline; import asyncio; asyncio.run(ai_enhanced_pipeline.initialize())"
```

4. **Start the backend server**
```bash
python -m app.main
```

### Frontend Setup

1. **Install Node.js dependencies**
```bash
cd dashboard
npm install
```

2. **Start the development server**
```bash
npm run dev
```

## 📖 API Documentation

### Core Endpoints

#### Interactions
- `POST /v1/interactions` - Create new interaction
- `GET /v1/interactions` - List interactions
- `GET /v1/interactions/{id}` - Get specific interaction

#### Audio Processing
- `POST /v1/upload` - Upload and process audio file
- `POST /v1/realtime/sessions` - Create real-time session
- `POST /v1/realtime/audio` - Add audio chunk
- `WebSocket /v1/realtime/ws/{session_id}` - Real-time communication

#### Agent Management
- `GET /v1/agents/status` - Get agent status
- `GET /v1/agents/tasks/{task_id}` - Get task status

#### Analytics
- `GET /v1/analytics/voice-kpis` - Voice-specific KPIs
- `GET /v1/analytics/ai-insights` - AI-powered insights
- `POST /v1/quality/assess` - Quality assessment

### Real-time Processing

#### Create Session
```bash
curl -X POST "http://localhost:8000/v1/realtime/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "interaction_id": "uuid",
    "user_id": "user1",
    "store_id": "store1",
    "language_hint": "auto"
  }'
```

#### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/v1/realtime/ws/session_id');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'transcript_update') {
    console.log('New transcript:', data.data.transcript);
  }
};
```

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# AI Model Configuration
ENABLE_GPU=true
MODEL_CACHE_DIR=/tmp/models
CONFIDENCE_THRESHOLD=0.7

# Real-time Processing
REALTIME_CHUNK_SIZE=500
REALTIME_BUFFER_SIZE=5
MAX_CONCURRENT_SESSIONS=10

# Quality Control
QUALITY_THRESHOLD=0.8
ENABLE_AUTO_QC=true
```

### Processing Modes

#### Basic Mode
- Standard Whisper transcription
- Basic sentiment analysis
- Simple keyword extraction

#### Enhanced Mode
- Advanced AI models
- Comprehensive NLP analysis
- Quality assessment
- Insight generation

#### Real-time Mode
- Live audio streaming
- Real-time transcription
- Instant analysis
- WebSocket communication

## 📊 Analytics and Insights

### Conversation Metrics
- **Overall Sentiment** - Positive/negative/neutral classification
- **Customer Satisfaction** - Satisfaction score based on conversation flow
- **Staff Performance** - Performance indicators and response quality
- **Conversation Quality** - Overall conversation assessment
- **Resolution Indicators** - Problem resolution tracking
- **Escalation Risk** - Risk assessment for escalation
- **Compliance Score** - Policy compliance evaluation

### AI Insights
- **Sentiment Trends** - Sentiment changes over time
- **Emotion Detection** - Multi-emotion classification
- **Intent Recognition** - Customer intent identification
- **Entity Extraction** - Key entities and information
- **Topic Modeling** - Conversation topics and themes
- **Quality Recommendations** - Improvement suggestions

### Speaker Analysis
- **Speaker Identification** - Customer vs. staff identification
- **Speaking Patterns** - Turn-taking and conversation flow
- **Sentiment Trends** - Individual speaker sentiment
- **Key Phrases** - Important phrases per speaker

## 🚀 Usage Examples

### Basic Audio Upload
```python
import requests

# Upload audio file
with open('audio.wav', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/v1/upload',
        files={'file': f},
        data={
            'interaction_id': 'uuid',
            'use_ai_analysis': 'true',
            'processing_mode': 'enhanced'
        }
    )

result = response.json()
print(f"Transcript: {result['transcript']}")
print(f"Sentiment: {result['nlp_analysis']['sentiment']}")
```

### Real-time Processing
```javascript
// Create session
const session = await fetch('/api/v1/realtime/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interaction_id: 'uuid',
    user_id: 'user1',
    store_id: 'store1'
  })
});

// Connect WebSocket
const ws = new WebSocket(`ws://localhost:8000/v1/realtime/ws/${session.session_id}`);

// Send audio chunks
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        ws.send(JSON.stringify({
          type: 'audio_chunk',
          data: base64Data
        }));
      };
      reader.readAsDataURL(event.data);
    };
    mediaRecorder.start(500);
  });
```

## 🔍 Quality Control

### Automated Quality Assessment
- **Transcription Quality** - Confidence scoring and error detection
- **Analysis Quality** - NLP model confidence and validation
- **Conversation Quality** - Overall conversation assessment
- **Compliance Check** - Policy adherence validation

### Quality Metrics
- **Confidence Scores** - Model confidence for each component
- **Processing Time** - Performance monitoring
- **Error Detection** - Automatic error identification
- **Recommendations** - Quality improvement suggestions

## 🌐 Multi-language Support

### Supported Languages
- **English** - Primary language with full support
- **Hindi** - Complete transcription and analysis
- **Tamil** - Regional language support
- **Telugu** - Regional language support
- **Bengali** - Regional language support
- **Gujarati** - Regional language support
- **Additional Languages** - Extensible for more languages

### Language Features
- **Automatic Detection** - Language identification from audio
- **Translation Support** - Cross-language translation
- **Cultural Context** - Language-specific analysis
- **Accent Adaptation** - Regional accent handling

## 🔧 Development

### Adding New Agents
```python
class CustomAgent(BaseAgent):
    def __init__(self, config: AgentConfig):
        super().__init__(config)
    
    async def process_task(self, task: Task) -> Dict[str, Any]:
        # Implement custom processing logic
        return {"result": "processed"}
    
    def validate_input(self, data: Dict[str, Any]) -> bool:
        # Implement input validation
        return True
```

### Extending AI Models
```python
# Add new model to AIEnhancedPipeline
async def _load_custom_model(self):
    self.models["custom"] = pipeline(
        "text-classification",
        model="your-custom-model"
    )
```

## 📈 Performance Optimization

### GPU Acceleration
- CUDA support for faster processing
- Model quantization for reduced memory usage
- Batch processing for multiple files

### Caching
- Model caching for faster startup
- Result caching for repeated queries
- Session state management

### Scalability
- Horizontal scaling with multiple workers
- Load balancing for high availability
- Database optimization for large datasets

## 🛡️ Security and Privacy

### Data Protection
- PII redaction and anonymization
- Secure audio transmission
- Encrypted storage options

### Access Control
- API key authentication
- Role-based access control
- Audit logging

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

## 🔮 Roadmap

### Upcoming Features
- **Advanced Speaker Diarization** - PyAnnote integration
- **Video Analysis** - Video conversation support
- **Custom Model Training** - User-specific model training
- **Advanced Analytics** - Business intelligence dashboards
- **API Rate Limiting** - Production-ready rate limiting
- **Database Integration** - PostgreSQL/MongoDB support
- **Cloud Deployment** - Docker and Kubernetes support

### Performance Improvements
- **Streaming Processing** - Real-time model inference
- **Model Optimization** - Quantization and pruning
- **Caching Layer** - Redis integration
- **Load Balancing** - Multi-instance deployment

---

**Convo Analytics** - Transforming conversations into actionable insights with the power of AI.
