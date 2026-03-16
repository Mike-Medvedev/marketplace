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
/opt/novnc/utils/novnc_proxy \
  --vnc "localhost:${VNC_PORT}" \
  --listen "${NOVNC_PORT}" &

echo "Locating Chromium..."
CHROME_BIN="$(
  find "${PLAYWRIGHT_BROWSERS_PATH}" \
    -type f \
    \( -path '*/chrome-linux64/chrome' -o -path '*/chrome-linux/chrome' \) \
    | sort \
    | head -n 1
)"

if [ -z "${CHROME_BIN}" ]; then
  echo "Could not find Chromium under ${PLAYWRIGHT_BROWSERS_PATH}"
  echo "Contents of ${PLAYWRIGHT_BROWSERS_PATH}:"
  find "${PLAYWRIGHT_BROWSERS_PATH}" -maxdepth 3 -type f || true
  exit 1
fi

echo "Using browser binary: ${CHROME_BIN}"

echo "Starting Chromium..."
"${CHROME_BIN}" \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="${CHROME_CDP_PORT}" \
  --user-data-dir=/tmp/chrome-profile \
  --window-size="${SCREEN_WIDTH},${SCREEN_HEIGHT}" \
  --window-position=0,0 \
  --start-maximized \
  --disable-background-networking \
  --disable-component-update \
  --disable-domain-reliability \
  --disable-sync \
  --disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication \
  --metrics-recording-only \
  --password-store=basic \
  --use-mock-keychain \
  --no-first-run \
  --no-default-browser-check \
  about:blank &

sleep 3

echo "Testing local CDP..."
curl -sf "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" || {
  echo "Chromium CDP did not come up"
  exit 1
}

echo "Proxying external CDP on 0.0.0.0:${EXTERNAL_CDP_PORT} -> 127.0.0.1:${CHROME_CDP_PORT}"
socat TCP-LISTEN:${EXTERNAL_CDP_PORT},fork,bind=0.0.0.0 TCP:127.0.0.1:${CHROME_CDP_PORT} &

sleep 1

echo "Testing external CDP proxy..."
curl -sf "http://127.0.0.1:${EXTERNAL_CDP_PORT}/json/version" || {
  echo "CDP proxy did not come up"
  exit 1
}

echo "Maximizing Chromium window..."
wmctrl -r "Chromium" -b add,maximized_vert,maximized_horz || true
wmctrl -r "Google Chrome" -b add,maximized_vert,maximized_horz || true

echo "Ready"
echo "noVNC: http://localhost:${NOVNC_PORT}/vnc.html"
echo "CDP:   http://localhost:${EXTERNAL_CDP_PORT}/json/version"

wait
