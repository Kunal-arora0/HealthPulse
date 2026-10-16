#!/usr/bin/env bash
# HealthPulse - One-Command Launcher for Presentations & Demos
echo "==================================================="
echo "  Launching HealthPulse (Gym & Nutrition OS)..."
echo "  Opening http://localhost:3000 in your browser..."
echo "==================================================="

# Automatically open the browser after server boots
(sleep 1.2 && open http://localhost:3000) &

# Run local web server on port 3000
npx serve -l 3000 .
