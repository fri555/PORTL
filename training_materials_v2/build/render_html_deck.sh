#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/richelleshi/workspace/portal/training_materials_v2"
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
OUT="$ROOT/build/html_render"
mkdir -p "$OUT"
for n in $(seq 1 22); do
  pad=$(printf '%02d' "$n")
  "$EDGE" --headless --disable-gpu --hide-scrollbars --no-sandbox --window-size=1920,1080 \
    --screenshot="$OUT/slide-$pad.png" "file://$ROOT/html-ppt/index.html#/$n"
done
