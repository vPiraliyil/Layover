#!/bin/bash
echo "Starting Layover..."
cd server
source .venv/Scripts/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..
cd client
npm run dev &
FRONTEND_PID=$!
cd ..
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both"
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
