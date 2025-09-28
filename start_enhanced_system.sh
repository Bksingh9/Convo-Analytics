#!/bin/bash

# Convo Analytics - Enhanced System Startup Script
# This script starts both the backend and frontend with all enhanced features

echo "🚀 Starting Convo Analytics Enhanced System..."
echo "=============================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Please stop the service using this port first."
        return 1
    fi
    return 0
}

# Check ports
echo "🔍 Checking ports..."
if ! check_port 8000; then
    exit 1
fi
if ! check_port 5173; then
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd ../dashboard
if [ ! -d "node_modules" ]; then
    npm install
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p /tmp/convo_analytics
mkdir -p /tmp/models

# Start backend server
echo "🔧 Starting backend server..."
cd ../backend
source venv/bin/activate

# Start backend in background
python -m app.main &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8000/v1/health > /dev/null; then
    echo "❌ Backend failed to start. Check the logs above."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully on http://localhost:8000"

# Start frontend server
echo "🎨 Starting frontend server..."
cd ../dashboard

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

echo "✅ Frontend started successfully on http://localhost:5173"

echo ""
echo "🎉 Convo Analytics Enhanced System is now running!"
echo "=============================================="
echo "📊 Frontend Dashboard: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📖 API Documentation: http://localhost:8000/docs"
echo ""
echo "🔍 Features Available:"
echo "  • AI-Powered Transcription"
echo "  • Real-time Audio Processing"
echo "  • Advanced Conversation Analysis"
echo "  • Quality Control & Validation"
echo "  • Multi-language Support"
echo "  • Speaker Diarization"
echo "  • Sentiment & Emotion Analysis"
echo "  • Intent Classification"
echo "  • Entity Extraction"
echo "  • Topic Modeling"
echo "  • Actionable Insights"
echo ""
echo "🛑 To stop the system, press Ctrl+C or run: ./stop_enhanced_system.sh"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Convo Analytics Enhanced System..."
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend server..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend server..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo "✅ System stopped successfully."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
echo "System is running. Press Ctrl+C to stop."
wait
