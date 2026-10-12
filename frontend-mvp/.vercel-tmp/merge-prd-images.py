import json
from pathlib import Path

root = Path(r'D:/工作/portal')
source_path = root / 'docs/需求文档/20261008-【PRD】AI工作台V1.3.0-天马智擎项目.next.jsonml'
remote_path = root / 'docs/需求文档/20261008-V1.3.0-dingtalk-with-new-media.jsonml'
output_path = root / 'docs/需求文档/20261008-【PRD】AI工作台V1.3.0-天马智擎项目.published.next.jsonml'

source = json.loads(source_path.read_text(encoding='utf-8-sig'))
remote_wrapper = json.loads(remote_path.read_text(encoding='utf-8-sig'))
remote = remote_wrapper['jsonml']

def images(node):
    found = []
    if isinstance(node, list):
        if node and node[0] == 'img':
            found.append(node)
        for child in node:
            found.extend(images(child))
    elif isinstance(node, dict):
        for child in node.values():
            found.extend(images(child))
    return found

source_images = images(source)
remote_images = images(remote)
if len(source_images) != 63:
    raise SystemExit(f'expected 63 source images, got {len(source_images)}')
if len(remote_images) != 65:
    raise SystemExit(f'expected 65 remote images after five uploads, got {len(remote_images)}')

existing = remote_images[:60]
uploaded = remote_images[60:]
for index, target in enumerate(source_images):
    if index == 22:
        chosen = uploaded[0]
    elif index == 49:
        chosen = uploaded[1]
    elif index >= 60:
        chosen = uploaded[index - 58]
    else:
        chosen = existing[index]
    target_props = target[1]
    remote_props = chosen[1]
    target_props['src'] = remote_props['src']
    target_props['uuid'] = remote_props['uuid']

output_path.write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({
    'sourceImages': len(source_images),
    'remoteImages': len(remote_images),
    'publishedImages': len(images(source)),
    'updatedSlots': [23, 50, 61, 62, 63],
    'output': str(output_path),
}, ensure_ascii=False))
