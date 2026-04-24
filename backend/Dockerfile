# 1. Use an official Python base image
FROM python:3.11-slim

# 2. Set environment variables to keep Python from buffering logs
# to stop creating .pyc (compile byte code) files
ENV PYTHONDONTWRITEBYTECODE=1 
# to make logging fast
ENV PYTHONUNBUFFERED=1

# 3. Set the working directory inside the container
WORKDIR /code

# 4. Install system dependencies for PostgreSQL (psycopg2)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python dependencies
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of your Django project code
COPY . /code/
