from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("training_materials_v3")
RAW = ROOT / "screenshots/raw"
OUT = ROOT / "screenshots/annotated"
OUT.mkdir(parents=True, exist_ok=True)
FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
font = ImageFont.truetype(FONT_PATH, 26)
small = ImageFont.truetype(FONT_PATH, 22)
RED = "#E53935"

# x1, y1, x2, y2, label, label x, label y
MARKS = {
    "01_home_overview.png": [
        (8, 55, 275, 760, "① 会话管理", 290, 95),
        (690, 300, 1515, 478, "② 输入 / 附件 / 模式 / 联网", 1120, 220),
        (710, 505, 1500, 715, "③ 日常办公快捷场景", 1130, 750),
    ],
    "02_mode_positioning.png": [(700, 300, 1080, 535, "日常办公 / 专家模式定位", 1095, 345)],
    "03_expert_mode.png": [(700, 475, 1510, 720, "按专业任务选择专家", 1120, 750)],
    "04_data_analysis_agent.png": [(690, 315, 1515, 505, "数据分析专家已选中", 1125, 535)],
    "05_local_attachment_limits.png": [(470, 205, 1405, 890, "首页：≤10MB，最多3个", 1030, 145)],
    "06_knowledge_picker.png": [(470, 205, 1405, 895, "从知识中心搜索并引用", 1015, 145)],
    "07_data_file_selected.png": [(485, 505, 1395, 780, "文件已选择，发送前核对", 1030, 815)],
    "08_data_analysis_prompt.png": [
        (495, 270, 1535, 655, "① 文件 + 六要素任务", 1100, 195),
        (495, 660, 1535, 780, "② 发送前复核", 1130, 805),
    ],
    "09_data_analysis_processing.png": [(710, 260, 1740, 500, "执行异常：保留会话并反馈", 1120, 520)],
    "10_conversation_search.png": [(485, 205, 1400, 900, "按关键词搜索历史会话", 1030, 145)],
    "11_knowledge_center.png": [
        (8, 55, 275, 600, "① 空间与知识库树", 290, 105),
        (300, 70, 1860, 510, "② 文件列表与操作", 1270, 540),
    ],
    "12_knowledge_upload_limits.png": [(1510, 65, 1635, 110, "进入目标知识库后上传", 1220, 130)],
    "13_workbench.png": [
        (820, 90, 1100, 150, "① 搜索系统入口", 1120, 100),
        (430, 175, 1520, 505, "② 按权限展示系统卡片", 1130, 535),
        (1540, 10, 1705, 55, "③ 我要吐槽 → 钉钉反馈", 1225, 75),
    ],
    "14_home_tabs.png": [
        (150, 0, 690, 58, "① 顶部 Tab：在首页、工作台、知识中心间切换", 700, 70),
        (0, 55, 275, 760, "② 左侧是会话历史区", 290, 115),
        (650, 250, 1520, 485, "③ 在输入区选择模式并描述任务", 1080, 510),
    ],
    "15_knowledge_center_actions.png": [
        (155, 0, 690, 58, "① 点击知识中心 Tab", 710, 65),
        (1505, 65, 1870, 115, "② 上传 / 新建文件夹 / 小智问答", 1280, 130),
        (1410, 985, 1490, 1075, "③ 任务中心入口", 1180, 950),
    ],
    "16_xiaozhi_qa.png": [
        (1470, 55, 1920, 1080, "小智问答：限定知识范围后提问", 1080, 160),
        (1500, 920, 1905, 1065, "在这里输入问题", 1190, 880),
    ],
    "17_task_center.png": [
        (1480, 0, 1920, 1080, "任务中心：查看文件上传任务", 1080, 120),
        (1635, 575, 1770, 640, "没有任务时可从这里上传", 1240, 650),
    ],
    "18_feedback_after_click.png": [
        (1540, 5, 1730, 58, "① 点击‘我要吐槽’", 1260, 75),
        (1470, 55, 1920, 1080, "② 本页可能不跳转，反馈表通常由钉钉打开", 940, 205),
    ],
    "19_daily_send.png": [
        (690, 300, 1495, 475, "① 输入任务内容", 1110, 220),
        (735, 420, 865, 470, "② 确认日常办公", 455, 500),
        (1440, 415, 1490, 465, "③ 点击发送", 1510, 350),
    ],
    "20_message_detail_actions.png": [
        (835, 135, 1690, 235, "① 已发送的问题", 1110, 75),
        (555, 245, 1690, 365, "② 处理状态与系统回答", 1120, 385),
        (550, 365, 610, 410, "③ 将鼠标移到消息附近查看操作", 630, 430),
    ],
}

def arrow(draw, start, end):
    draw.line([start, end], fill=RED, width=6)
    x1, y1 = start
    x2, y2 = end
    dx, dy = x2 - x1, y2 - y1
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    tip = (x2, y2)
    left = (x2 - ux * 22 + px * 11, y2 - uy * 22 + py * 11)
    right = (x2 - ux * 22 - px * 11, y2 - uy * 22 - py * 11)
    draw.polygon([tip, left, right], fill=RED)

for name, marks in MARKS.items():
    image = Image.open(RAW / name).convert("RGB").resize((1920, 1080), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image, "RGBA")
    for x1, y1, x2, y2, label, lx, ly in marks:
        draw.rectangle((x1, y1, x2, y2), outline=RED, width=6)
        bbox = draw.textbbox((0, 0), label, font=small)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.rounded_rectangle((lx - 12, ly - 8, lx + tw + 12, ly + th + 10), radius=8, fill=(229, 57, 53, 235))
        draw.text((lx, ly), label, font=small, fill="white")
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        sx = lx if lx < cx else lx + tw
        sy = ly + th // 2
        arrow(draw, (sx, sy), (cx, cy))
    image.save(OUT / name, "PNG", optimize=True)
