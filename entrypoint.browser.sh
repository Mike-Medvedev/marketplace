#!/usr/bin/env bash
set -euo pipefail

# Chromium needs a local (non-SMB) profile dir; per-user Playwright
# storage states are persisted as {CHROME_PROFILE_DIR}/{userId}.json
# by the API server on the fileshare.
LOCAL_PROFILE="/tmp/chrome-profile"
mkdir -p "${LOCAL_PROFILE}"

trap 'exit 0' SIGTERM SIGINT

echo "Starting Xvfb at ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH}..."
Xvfb "${DISPLAY}" -screen 0 "${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH}" -ac &
sleep 1

echo "Configuring fluxbox (no toolbar, no tabs, no decorations)..."
mkdir -p ~/.fluxbox

cat > ~/.fluxbox/init <<'FLUXCFG'
session.screen0.toolbar.visible: false
session.screen0.toolbar.widthPercent: 0
session.screen0.tabs.intitlebar: false
session.screen0.window.focus.model: ClickFocus
session.screen0.defaultDeco: NONE
session.screen0.colPlacementDirection: TopToBottom
session.screen0.rowPlacementDirection: LeftToRight
session.styleFile: /usr/share/fluxbox/styles/Emerge
session.styleOverlay: ~/.fluxbox/overlay
FLUXCFG

cat > ~/.fluxbox/overlay <<'OVERLAY'
window.title.height: 0
window.handleWidth: 0
window.borderWidth: 0
window.bevelWidth: 0
toolbar.height: 0
toolbar.borderWidth: 0
OVERLAY

cat > ~/.fluxbox/apps <<'APPS'
[app] (.*) 
  [Deco] {NONE}
  [Dimensions] {1920 1080}
  [Position] {0 0}
  [Maximized] {yes}
[end]
APPS

echo "Starting fluxbox..."
fluxbox &
sleep 1

echo "Starting x11vnc..."
x11vnc \
  -display "${DISPLAY}" \
  -forever \
  -shared \
  -nopw \
  -rfbport "${VNC_PORT}" \
  -listen 0.0.0.0 \
  -noxdamage \
  -xkb &

echo "Starting noVNC..."
/opt/novnc/utils/novnc_proxy \
  --vnc "localhost:${VNC_PORT}" \
  --listen 0.0.0.0:"${NOVNC_PORT}" \
  --web /opt/novnc &

echo "Locating Chromium..."
CHROME_BIN="$(
  find "${PLAYWRIGHT_BROWSERS_PATH}" \
    -type f \
    \( -path '*/chrome-linux64/chrome' -o -path '*/chrome-linux/chrome' \) \
    | sort \
    | head -n 1
)"

if [ -z "${CHROME_BIN}" ]; then
  echo "ERROR: Chromium binary not found"
  exit 1
fi

echo "Starting Chromium (headful kiosk, CDP on port ${CHROME_CDP_PORT})..."
"${CHROME_BIN}" \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --disable-gpu-compositing \
  --disable-gpu-sandbox \
  --disable-software-rasterizer \
  --use-gl=swiftshader \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port="${CHROME_CDP_PORT}" \
  --remote-allow-origins=* \
  --user-data-dir="${LOCAL_PROFILE}" \
  --window-size="${SCREEN_WIDTH},${SCREEN_HEIGHT}" \
  --window-position=0,0 \
  --kiosk \
  --no-first-run \
  --no-default-browser-check \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI,InfiniteSessionRestore,InfoBars \
  --disable-popup-blocking \
  --test-type \
  --enable-automation \
  --password-store=basic \
  --disable-background-networking \
  about:blank &

echo "Waiting for CDP to be ready..."
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" > /dev/null 2>&1; then
    echo "CDP ready after ${i}s"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "ERROR: Chromium CDP failed to initialize after 20s"
    exit 1
  fi
  sleep 1
done

sleep 1
echo "Maximizing Chromium window..."
for i in $(seq 1 5); do
  if wmctrl -l | grep -qi "chromium"; then
    wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz 2>/dev/null || true
    echo "Window maximized"
    break
  fi
  sleep 1
done

echo "=== Browser sidecar ready ==="
echo "  noVNC : http://0.0.0.0:${NOVNC_PORT}/vnc.html"
echo "  CDP   : http://0.0.0.0:${CHROME_CDP_PORT}/json/version"
echo "  Screen: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH}"

wait