#!/bin/bash

echo "Building Claude Code Docker environment..."
docker-compose -f docker-compose.claude.yml build

echo ""
echo "Starting Claude Code container..."
echo "This will give you a bash shell with Claude Code CLI available."
echo ""

# Run the container interactively
docker-compose -f docker-compose.claude.yml run --rm claude-code