import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
CONVERTER_PATH = SKILL_DIR / "scripts" / "md2jsonml.py"


def load_converter():
    spec = importlib.util.spec_from_file_location("prd_md2jsonml", CONVERTER_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DingTalkExportTests(unittest.TestCase):
    def test_fixed_prd_template_converts_to_styled_jsonml(self):
        converter = load_converter()
        markdown = """**产品需求说明书**
**示例项目**

<!-- preface -->
# 版本信息

| 版本号 | 状态 |
| --- | --- |
| V1.0 | 草稿 |

# 产品概述

## 产品目标

- 验证固定模板

# 功能需求

## 功能详情

### M1-示例能力

#### 业务主流程图及说明

```mermaid
graph TD; A-->B
```
"""
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "prd.md"
            source.write_text(markdown, encoding="utf-8")
            root = converter.convert(str(source), "示例项目")

        self.assertEqual("root", root[0])
        toc = next(block for block in root[2:] if block[0] == "toc")
        self.assertEqual({"title", "item", "global"}, set(toc[1]["styles"]))
        self.assertTrue(
            any(block[0] == "code" and block[1].get("syntax") == "mermaid" for block in root[2:])
        )
        version_heading = next(
            block for block in root[2:] if block[0] == "h1" and "list" not in block[1]
        )
        self.assertNotIn("numPr", version_heading[1])
        numbered_heading = next(
            block for block in root[2:] if block[0] == "h1" and "list" in block[1]
        )
        self.assertIn("numPr", numbered_heading[1])

    def test_table_br_becomes_multiple_paragraphs_in_one_cell(self):
        converter = load_converter()
        markdown = """**产品需求说明书**
**示例项目**

# 功能需求

| 元素 | 描述 |
| --- | --- |
| 【筛选】选择 | 第一点<br>第二点<br/>第三点 |
"""
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "prd.md"
            source.write_text(markdown, encoding="utf-8")
            root = converter.convert(str(source), "示例项目")

        table = next(block for block in root[2:] if block[0] == "table")
        description_cell = table[3][3]
        paragraphs = [child for child in description_cell[2:] if child[0] == "p"]
        self.assertEqual(3, len(paragraphs))
        self.assertNotIn("<br", json.dumps(description_cell, ensure_ascii=False).lower())

    def test_cli_writes_valid_jsonml_file(self):
        converter = load_converter()
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "prd.md"
            output = Path(tmp) / "prd.jsonml"
            source.write_text("**产品需求说明书**\n**示例项目**\n\n# 产品概述\n正文", encoding="utf-8")
            root = converter.convert(str(source), "示例项目")
            output.write_text(json.dumps(root, ensure_ascii=False), encoding="utf-8")
            loaded = json.loads(output.read_text(encoding="utf-8"))

        self.assertEqual("root", loaded[0])
        self.assertGreater(len(loaded), 3)

    def test_consecutive_ordered_items_share_one_list(self):
        converter = load_converter()
        markdown = "**产品需求说明书**\n**示例项目**\n\n# 产品目标\n\n1. 目标一\n2. 目标二\n"
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "prd.md"
            source.write_text(markdown, encoding="utf-8")
            root = converter.convert(str(source), "示例项目")

        list_blocks = [block for block in root[2:] if block[0] == "p" and "list" in block[1]]
        self.assertEqual(2, len(list_blocks))
        self.assertEqual(list_blocks[0][1]["list"]["listId"], list_blocks[1][1]["list"]["listId"])


if __name__ == "__main__":
    unittest.main()
