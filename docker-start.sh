#!/bin/bash

echo "Starting DAO Helper Tool in Docker..."

# First, let's just start the database
echo "Starting PostgreSQL with pgvector..."
docker-compose up -d postgres

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Now start the backend
echo "Starting backend service..."
docker-compose up -d backend

# Finally start the frontend
echo "Starting frontend service..."
docker-compose up -d frontend

echo ""
echo "Services are starting up!"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:3004"
echo "- Database: localhost:5432"
echo ""
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop: docker-compose down"