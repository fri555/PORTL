#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/richelleshi/workspace/portal/training_materials_v2"
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
for svg in "$ROOT"/screenshots/annotated/*.svg; do
  name="$(basename "$svg" .svg)"
  "$EDGE" --headless --disable-gpu --hide-scrollbars --no-sandbox --window-size=1440,900 \
    --screenshot="$ROOT/screenshots/annotated/$name.png" "file://$svg"
done
