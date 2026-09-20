#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/richelleshi/workspace/portal/training_materials_v2"
NODE="/Users/richelleshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
MAKE="$ROOT/build/make_static_snapshot.mjs"
RAW="$ROOT/screenshots/raw"
BASE="https://test-ai-workbanch-45.tianmagroup.com/"

COMMON=("$RAW/css_00.css" "$RAW/css_01.css" "$RAW/css_02.css" "$RAW/css_03a.css" "$RAW/css_03b.css" "$RAW/css_04.css")
HOME=("${COMMON[@]}" "$RAW/css_08.css" "$RAW/css_09.css")
KNOWLEDGE=("${COMMON[@]}" "$RAW/css_knowledge.css")
DASHBOARD=("${COMMON[@]}" "$RAW/css_dashboard.css")
WORKBENCH=("${COMMON[@]}" "$RAW/css_workbench.css")

render_one() {
  local id="$1" source="$2" css_group="$3"
  local -a css
  case "$css_group" in
    home) css=("${HOME[@]}") ;;
    knowledge) css=("${KNOWLEDGE[@]}") ;;
    dashboard) css=("${DASHBOARD[@]}") ;;
    workbench) css=("${WORKBENCH[@]}") ;;
  esac
  "$NODE" "$MAKE" "$RAW/$source" "$RAW/render_$id.html" "$BASE" "${css[@]}"
  "$EDGE" --headless --disable-gpu --hide-scrollbars --no-sandbox --window-size=1440,900 \
    --screenshot="$RAW/$id.png" "file://$RAW/render_$id.html"
}

render_one 05_eval_expert snapshot_05_eval_expert.html home
render_one 07_knowledge_picker snapshot_07_knowledge_picker.html home
render_one 09_kb_inside snapshot_09_kb_inside.html knowledge
render_one 10_kb_upload snapshot_10_kb_upload.html knowledge
render_one 11_dashboard snapshot_11_dashboard.html dashboard
render_one 12_dashboard_config snapshot_12_dashboard_config.html dashboard
render_one 13_workbench snapshot_13_workbench.html workbench
