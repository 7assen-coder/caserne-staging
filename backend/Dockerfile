# 1. Use an official Python base image
FROM python:3.11-slim

# 2. Set environment variables to keep Python from buffering logs
# to stop creating .pyc (compile byte code) files
ENV PYTHONDONTWRITEBYTECODE=1 
# to make logging fast
ENV PYTHONUNBUFFERED=1

# 3. Set the working directory inside the container
WORKDIR /code

# 4. Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python dependencies
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of your Django project code
COPY . /code/

# 7. Set the entrypoint
COPY entrypoint.sh /code/
RUN chmod +x /code/entrypoint.sh
ENTRYPOINT ["/code/entrypoint.sh"]

# Render injects PORT; local/docker-compose can override the command
CMD ["sh", "-c", "gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 3"]
