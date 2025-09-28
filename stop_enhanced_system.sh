#!/bin/bash

# Convo Analytics - Enhanced System Stop Script

echo "🛑 Stopping Convo Analytics Enhanced System..."

# Kill processes on ports 8000 and 5173
echo "Stopping backend server (port 8000)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No backend process found"

echo "Stopping frontend server (port 5173)..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "No frontend process found"

# Kill any remaining Python processes related to the app
echo "Stopping any remaining app processes..."
pkill -f "app.main" 2>/dev/null || echo "No app processes found"

echo "✅ System stopped successfully."
