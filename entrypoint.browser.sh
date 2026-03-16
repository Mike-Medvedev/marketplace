#!/bin/bash
set -e

Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
sleep 1

chromium \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --window-size=1280,720 \
  --start-maximized \
  --disable-background-networking \
  --disable-default-apps \
  --no-first-run \
  &
sleep 2

x11vnc -display :99 -nopw -listen 0.0.0.0 -forever -shared -rfbport 5900 \
  -noxdamage \
  -ncache 10 \
  -quality 9 \
  -compress 0 \
  &

exec websockify 0.0.0.0:6080 localhost:5900
