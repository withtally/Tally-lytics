FROM node:18-slim

WORKDIR /app

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean

# Set environment variables
ENV NODE_ENV=production

# Create a simple script to run the curl command
RUN echo '#!/bin/sh\necho "Cron job started at $(date)"\ncurl -v -X POST $MAIN_SERVICE_URL/api/crawl/start/all -H "Content-Type: application/json"\nEXIT_CODE=$?\necho "Curl completed with exit code: $EXIT_CODE at $(date)"\n' > /app/run.sh
RUN chmod +x /app/run.sh

# Set the command to run
CMD ["/app/run.sh"]