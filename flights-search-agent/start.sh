#!/bin/bash

# Flight Search Agent - Startup Script

set -e

echo "🚀 Starting Flight Search Agent..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local - Please edit with your AWS credentials"
    echo ""
    echo "Required environment variables:"
    echo "  - AWS_ACCESS_KEY_ID"
    echo "  - AWS_SECRET_ACCESS_KEY"
    echo "  - AWS_REGION"
    echo ""
    echo "Edit .env.local and run this script again."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📚 Installing dependencies..."
pip install -q --upgrade pip 2>/dev/null || echo "⚠️  Warning: Could not upgrade pip"

if ! pip install -q -r requirements.txt 2>/dev/null; then
    echo "⚠️  Failed to install with pinned versions, trying flexible versions..."
    if pip install -q -r requirements-flexible.txt; then
        echo "✅ Dependencies installed (using flexible versions)"
    else
        echo "❌ Failed to install dependencies"
        echo ""
        echo "If you see SSL certificate errors, run:"
        echo "  /Applications/Python\ 3.13/Install\ Certificates.command"
        echo ""
        echo "Or see INSTALL.md for detailed troubleshooting."
        exit 1
    fi
else
    echo "✅ Dependencies installed"
fi
echo ""

# Start the A2A server
echo "🌟 Starting A2A Protocol server..."
echo ""
echo "   A2A Protocol Endpoints:"
echo "   AgentCard: http://localhost:5000/.well-known/agent.json"
echo "   Send Message: http://localhost:5000/v1/message:send"
echo "   API Docs: http://localhost:5000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python run_a2a.py
