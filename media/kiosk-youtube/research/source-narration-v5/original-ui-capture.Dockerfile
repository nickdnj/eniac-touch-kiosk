FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tk xvfb x11-utils ffmpeg procps fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
