#!/usr/bin/env bash
set -euo pipefail

echo "Starting Xvfb..."
Xvfb "${DISPLAY}" -screen 0 "${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH}" &

sleep 1

echo "Starting fluxbox..."
fluxbox &

echo "Starting x11vnc..."
x11vnc \
  -display "${DISPLAY}" \
  -forever \
  -shared \
  -nopw \
  -rfbport "${VNC_PORT}" \
  -listen 0.0.0.0 \
  -noxdamage &

echo "Starting noVNC..."
# Bind novnc_proxy to 0.0.0.0 so external traffic reaches it
/opt/novnc/utils/novnc_proxy \
  --vnc "localhost:${VNC_PORT}" \
  --listen 0.0.0.0:"${NOVNC_PORT}" &

echo "Locating Chromium..."
CHROME_BIN="$(
  find "${PLAYWRIGHT_BROWSERS_PATH}" \
    -type f \
    \( -path '*/chrome-linux64/chrome' -o -path '*/chrome-linux/chrome' \) \
    | sort \
    | head -n 1
)"

# (Keep your existing check here)
if [ -z "${CHROME_BIN}" ]; then exit 1; fi

echo "Starting Chromium..."
"${CHROME_BIN}" \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port="${CHROME_CDP_PORT}" \
  --remote-allow-origins=* \
  --user-data-dir=/tmp/chrome-profile \
  --window-size="${SCREEN_WIDTH},${SCREEN_HEIGHT}" \
  --start-maximized \
  --no-first-run \
  --no-default-browser-check \
  about:blank &

sleep 3

# Verify direct connectivity to the CDP port
echo "Testing direct CDP connectivity on port ${CHROME_CDP_PORT}..."
curl -sf "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" || {
  echo "Chromium CDP failed to initialize"
  exit 1
}

echo "Maximizing Chromium window..."
wmctrl -r "Chromium" -b add,maximized_vert,maximized_horz || true

echo "Ready"
echo "noVNC: http://<container-ip>:${NOVNC_PORT}/vnc.html"
echo "CDP:   http://<container-ip>:${CHROME_CDP_PORT}/json/version"

wait