# -*- coding: utf-8 -*-
"""Convert a fixed-template PRD Markdown file to DingTalk JsonML."""

import argparse
import json
import os
import re


FONTS = {
    "ascii": "微软雅黑",
    "cs": "Arial",
    "eastAsia": "微软雅黑",
    "hAnsi": "微软雅黑",
    "hint": "eastAsia",
}
BODY_RUN = {"fonts": FONTS, "sz": 12, "szUnit": "pt"}
CELL_RUN = {"fonts": FONTS, "sz": 11, "szUnit": "pt"}
FULL_BORDER = {
    side: {"color": "#000000", "space": 0, "sz": 0.67, "val": "single"}
    for side in ("bottom", "insideH", "insideV", "left", "right", "top")
}

_counter = 0


def new_id():
    global _counter
    _counter += 1
    return "u%06d" % _counter


def leaf(text, props=None):
    attrs = {"data-type": "leaf"}
    if props:
        attrs.update(props)
    return ["span", attrs, text]


def text_span(text, props=None):
    return ["span", {"data-type": "text"}, leaf(text, props)]


def inline_children(text, run=None):
    """Parse the fixed template's common inline Markdown forms."""
    run = dict(run or {})
    text = re.sub(r"\$\\color\{[^}]*\}\{([^}]*)\}\$", r"\1", text)
    token_re = re.compile(
        r"(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*.+?\*\*|~~.+?~~|`[^`]+`|_[^_]+_)"
    )
    children = []
    pos = 0
    for match in token_re.finditer(text):
        if match.start() > pos:
            children.append(text_span(text[pos:match.start()], run))
        token = match.group(0)
        image_match = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", token)
        link_match = re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", token)
        if image_match:
            children.append(
                [
                    "img",
                    {"src": image_match.group(2).strip(), "alt": image_match.group(1), "uuid": new_id()},
                    text_span(""),
                ]
            )
        elif link_match:
            children.append(text_span(link_match.group(1), run))
        elif token.startswith("**"):
            children.append(text_span(token[2:-2], {**run, "bold": True}))
        elif token.startswith("~~"):
            children.append(text_span(token[2:-2], {**run, "strike": True}))
        elif token.startswith("`"):
            children.append(["inlineCode", {"uuid": new_id()}, text_span(token[1:-1])])
        else:
            children.append(text_span(token[1:-1], {**run, "italic": True}))
        pos = match.end()
    if pos < len(text):
        children.append(text_span(text[pos:], run))
    return children or [text_span("", run)]


def paragraph(text, extra=None):
    attrs = {"uuid": new_id(), "spacing": {"line": 1.0, "lineRule": "auto"}}
    if extra:
        attrs.update(extra)
    return ["p", attrs, *inline_children(text, BODY_RUN)]


def heading(level, text, numbered=True):
    attrs = {"uuid": new_id(), "rPr": {"fonts": FONTS}}
    if level == 1:
        attrs.update({"styleId": "1", "spacing": {"line": 2.4, "lineRule": "auto"}})
        if numbered:
            attrs["pageBreakBefore"] = True
    elif level == 2:
        attrs.update({"styleId": "2", "spacing": {"before": "13pt", "line": 1.73, "lineRule": "auto"}})
    else:
        attrs["spacing"] = {"before": "10pt", "line": 1.5, "lineRule": "auto"}
    if numbered:
        pattern = ".".join("%%%d" % i for i in range(1, level + 1))
        attrs["list"] = {
            "listId": "prd-heading-list",
            "level": level - 1,
            "listStyleType": "DEC_DEC_DEC_P",
            "listStyle": {"format": "decimal", "text": pattern, "align": "left"},
            "isOrdered": True,
            "autoLevel": True,
        }
        attrs["numPr"] = {"id": "3", "level": level - 1}
    props = {"fonts": FONTS, "color": "#000000"}
    if level >= 3:
        props.update({"bold": True, "sz": {3: 14.5, 4: 13}.get(level, 12), "szUnit": "pt"})
    return ["h%d" % level, attrs, text_span(text, props)]


def split_cells(line):
    value = line.strip().strip("|")
    return [cell.strip() for cell in re.split(r"(?<!\\)\|", value)]


def separator_row(line):
    cells = split_cells(line)
    return bool(cells) and all(re.fullmatch(r":?-{2,}:?", cell) for cell in cells)


def table(rows, example=False):
    column_count = max(len(row) for row in rows)
    table_rows = []
    for row_index, row in enumerate(rows):
        cells = []
        for column_index in range(column_count):
            value = row[column_index] if column_index < len(row) else ""
            run = dict(CELL_RUN)
            if row_index == 0:
                run["bold"] = True
            elif example:
                run["color"] = "#FB8C00"
            # DingTalk does not interpret the literal Markdown/HTML string
            # ``<br>`` inside JsonML text.  Convert every table-cell break
            # into a real paragraph so multi-point descriptions render on
            # separate lines in the same cell.
            cell_paragraphs = []
            for segment in re.split(r"<br\s*/?>", value, flags=re.IGNORECASE):
                cell_paragraphs.append(
                    [
                        "p",
                        {
                            "uuid": new_id(),
                            "jc": "center" if row_index == 0 else "left",
                            "spacing": {"line": 1.0, "lineRule": "auto"},
                        },
                        *inline_children(segment, run),
                    ]
                )
            cell_attrs = {"colSpan": 1, "rowSpan": 1, "vAlign": "bottom", "uuid": new_id()}
            if row_index == 0:
                cell_attrs["fill"] = "#C0C0C0"
            cells.append(["tc", cell_attrs, *cell_paragraphs])
        table_rows.append(["tr", {"h": 22, "hRule": "none", "uuid": new_id()}, *cells])
    return [
        "table",
        {
            "bdr": FULL_BORDER,
            "colsWidth": [round(100 / column_count, 2)] * column_count,
            "jc": "center",
            "tblLook": {"firstColumn": 1, "firstRow": 1, "lastColumn": 0, "lastRow": 0, "noHBand": 0, "noVBand": 1},
            "uuid": new_id(),
            "tblW": {"w": 100, "type": "pct"},
        },
        *table_rows,
    ]


def code_block(language, code):
    syntax = "mermaid" if language.lower() == "mermaid" else (language or "plaintext")
    return ["code", {"syntax": syntax, "theme": "default", "uuid": new_id(), "code": code}, text_span(code)]


def cover(text, first):
    props = {"bold": True, "fonts": FONTS, "sz": 26 if first else 36, "szUnit": "pt"}
    if first:
        props["italic"] = True
        props["color"] = "#000000"
    return ["p", {"jc": "center", "uuid": new_id()}, text_span(text, props)]


def spacer():
    return ["p", {"jc": "center", "uuid": new_id()}, text_span("")]


def build_toc(headings):
    counters = [0] * 6
    roots = []
    stack = []
    for block in headings:
        level = int(block[0][1:]) - 1
        counters[level] += 1
        for idx in range(level + 1, len(counters)):
            counters[idx] = 0
        number = ".".join(str(counters[idx]) for idx in range(level + 1))
        if level == 0:
            number += "."
        title = block[2][2][2]
        node = {
            "uuid": new_id(),
            "anchorId": block[1]["uuid"],
            "contents": [{"type": "text", "data": number + " "}, {"type": "text", "data": title}],
            "text": number + " " + title,
            "level": level,
            "children": [],
        }
        while stack and stack[-1][0] >= level:
            stack.pop()
        if stack:
            stack[-1][1]["children"].append(node)
        else:
            roots.append(node)
        stack.append((level, node))
    return [
        "toc",
        {
            "uuid": new_id(),
            "mode": "outline",
            "title": "目录",
            "styles": {
                "title": {
                    "font": "DingTalk JinBuTi",
                    "color": "rgb(23, 24, 28)",
                    "numbering": False,
                    "css": {"fontWeight": "normal"},
                },
                "item": {"symbol": "disc", "css": {}},
                "global": {
                    "maxLevel": 3,
                    "bgColor": "rgba(166, 166, 166, 0.1)",
                    "css": {},
                },
            },
            "content": roots,
        },
    ]


def detect_cover(lines, doc_title, cover_a, cover_b):
    index = 0
    found = []
    while index < len(lines) and len(found) < 2:
        value = lines[index].strip()
        if not value:
            index += 1
            continue
        match = re.fullmatch(r"\*\*(.+)\*\*|_(.+)_", value)
        if not match:
            break
        found.append(match.group(1) or match.group(2))
        index += 1
    return cover_a or (found[0] if found else None), cover_b or (found[1] if len(found) > 1 else doc_title), index


def convert(src_path, doc_title, cover_a=None, cover_b=None):
    global _counter
    _counter = 0
    with open(src_path, encoding="utf-8") as source:
        lines = source.read().splitlines()
    cover_a, cover_b, index = detect_cover(lines, doc_title, cover_a, cover_b)
    body = []
    numbered_headings = []
    pending_preface = False
    preface_active = False
    pending_example = False
    while index < len(lines):
        raw = lines[index]
        value = raw.strip()
        if not value:
            index += 1
            continue
        if value == "<!-- preface -->":
            pending_preface = True
            index += 1
            continue
        if value in ("<!-- 示例 -->", "<!-- 示例表 -->", "<!-- orange -->"):
            pending_example = True
            index += 1
            continue
        if value.startswith("```"):
            language = value[3:].strip()
            index += 1
            collected = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                collected.append(lines[index])
                index += 1
            index += 1
            body.append(code_block(language, "\n".join(collected)))
            continue
        if value.startswith("|") and index + 1 < len(lines) and separator_row(lines[index + 1]):
            rows = [split_cells(raw)]
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                rows.append(split_cells(lines[index]))
                index += 1
            body.append(table(rows, pending_example))
            pending_example = False
            continue
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", value)
        if heading_match:
            level = len(heading_match.group(1))
            if pending_preface:
                preface_active = True
                pending_preface = False
            elif preface_active and level == 1:
                preface_active = False
            block = heading(level, heading_match.group(2), numbered=not preface_active)
            body.append(block)
            if not preface_active:
                numbered_headings.append(block)
            index += 1
            continue
        list_match = re.match(r"^(\s*)([-*]|\d+[.)])\s+(.+)$", raw)
        if list_match:
            ordered = list_match.group(2)[0].isdigit()
            list_id = "list-%s" % new_id()
            while index < len(lines):
                item_match = re.match(r"^(\s*)([-*]|\d+[.)])\s+(.+)$", lines[index])
                if not item_match or item_match.group(2)[0].isdigit() != ordered:
                    break
                depth = len(item_match.group(1)) // 2
                body.append(
                    paragraph(
                        item_match.group(3),
                        {
                            "list": {
                                "listId": list_id,
                                "isOrdered": ordered,
                                "level": depth,
                                "listStyle": {"format": "decimal" if ordered else "bullet", "text": "%1." if ordered else "●"},
                            }
                        },
                    )
                )
                index += 1
            continue
        if value.startswith(">"):
            body.append(paragraph(value.lstrip("> "), {"blockquote": True}))
            index += 1
            continue
        body.append(paragraph(value))
        index += 1

    result = ["root", {}]
    if cover_a:
        result.extend([cover(cover_a, True), spacer()])
    if cover_b:
        result.extend([cover(cover_b, False), spacer()])
    preface_count = 0
    while preface_count < len(body):
        block = body[preface_count]
        if block[0] == "h1" and "list" in block[1]:
            break
        preface_count += 1
    result.extend(body[:preface_count])
    result.append(build_toc(numbered_headings))
    result.extend(body[preface_count:])
    return result


def main():
    parser = argparse.ArgumentParser(description="Convert fixed-template PRD Markdown to DingTalk JsonML")
    parser.add_argument("input")
    parser.add_argument("-o", "--output")
    parser.add_argument("-t", "--doc-title")
    parser.add_argument("--cover-a")
    parser.add_argument("--cover-b")
    args = parser.parse_args()
    title = args.doc_title or os.path.splitext(os.path.basename(args.input))[0]
    output = args.output or os.path.splitext(args.input)[0] + ".jsonml"
    root = convert(args.input, title, args.cover_a, args.cover_b)
    with open(output, "w", encoding="utf-8") as target:
        json.dump(root, target, ensure_ascii=False)
    print("blocks:", len(root) - 2, "title:", title)
    print("wrote", output)


if __name__ == "__main__":
    main()
