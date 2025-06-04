# Dockerfile for running Claude Code CLI in a container
FROM ubuntu:22.04

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    vim \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install Docker CLI (for docker-in-docker if needed)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Set up shell
SHELL ["/bin/bash", "-c"]

# Create entrypoint script
RUN echo '#!/bin/bash\n\
echo "Claude Code Docker Environment Ready!"\n\
echo "Run '\''claude'\'' to start Claude Code"\n\
echo "Your project is mounted at /workspace"\n\
exec bash' > /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]