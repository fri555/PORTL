from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path('/Users/richelleshi/workspace/portal/training_materials')
ASSET = ROOT / 'assets'
MANUAL = ROOT / '天马智擎平台使用说明.docx'
SCRIPT = ROOT / '天马智擎平台培训讲稿.docx'

BLUE = '2F7CF6'
DARK_BLUE = '1F4D78'
MUTED = '5E626B'
LIGHT_BLUE = 'EAF3FF'
LIGHT_GRAY = 'F2F4F7'
GOLD = '8A5A00'
RED = '9B1C1C'
BODY_FONT = 'Hiragino Sans GB'
EAST_ASIA_FONT = 'Hiragino Sans GB'


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tc_pr.append(shd)
    shd.set(qn('w:fill'), fill)


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in('w:tcMar')
    if tc_mar is None:
        tc_mar = OxmlElement('w:tcMar')
        tc_pr.append(tc_mar)
    for m, value in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tc_mar.find(qn(f'w:{m}'))
        if node is None:
            node = OxmlElement(f'w:{m}')
            tc_mar.append(node)
        node.set(qn('w:w'), str(value))
        node.set(qn('w:type'), 'dxa')


def set_table_geometry(table, widths_dxa, indent_dxa=120):
    table.autofit = False
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    tbl_w = tbl_pr.find(qn('w:tblW'))
    if tbl_w is None:
        tbl_w = OxmlElement('w:tblW')
        tbl_pr.append(tbl_w)
    tbl_w.set(qn('w:w'), str(sum(widths_dxa)))
    tbl_w.set(qn('w:type'), 'dxa')
    tbl_ind = tbl_pr.find(qn('w:tblInd'))
    if tbl_ind is None:
        tbl_ind = OxmlElement('w:tblInd')
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn('w:w'), str(indent_dxa))
    tbl_ind.set(qn('w:type'), 'dxa')
    grid = tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths_dxa:
        col = OxmlElement('w:gridCol')
        col.set(qn('w:w'), str(width))
        grid.append(col)
    for row in table.rows:
        for i, cell in enumerate(row.cells):
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn('w:tcW'))
            if tc_w is None:
                tc_w = OxmlElement('w:tcW')
                tc_pr.append(tc_w)
            tc_w.set(qn('w:w'), str(widths_dxa[i]))
            tc_w.set(qn('w:type'), 'dxa')
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def set_run(run, size=None, bold=None, color=None, italic=None):
    run.font.name = BODY_FONT
    run._element.get_or_add_rPr().rFonts.set(qn('w:ascii'), BODY_FONT)
    run._element.get_or_add_rPr().rFonts.set(qn('w:hAnsi'), BODY_FONT)
    run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), EAST_ASIA_FONT)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def setup_doc(doc, label):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)
    section.different_first_page_header_footer = True

    normal = doc.styles['Normal']
    normal.font.name = BODY_FONT
    normal._element.rPr.rFonts.set(qn('w:ascii'), BODY_FONT)
    normal._element.rPr.rFonts.set(qn('w:hAnsi'), BODY_FONT)
    normal._element.rPr.rFonts.set(qn('w:eastAsia'), EAST_ASIA_FONT)
    normal.font.size = Pt(11)
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.25

    for style_name, size, color, before, after in [
        ('Heading 1', 16, BLUE, 18, 10),
        ('Heading 2', 13, BLUE, 14, 7),
        ('Heading 3', 12, DARK_BLUE, 10, 5),
    ]:
        style = doc.styles[style_name]
        style.font.name = BODY_FONT
        style._element.rPr.rFonts.set(qn('w:ascii'), BODY_FONT)
        style._element.rPr.rFonts.set(qn('w:hAnsi'), BODY_FONT)
        style._element.rPr.rFonts.set(qn('w:eastAsia'), EAST_ASIA_FONT)
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.font.bold = True
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    header = section.header
    p = header.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(label)
    set_run(r, size=9, bold=True, color=MUTED)
    p.paragraph_format.space_after = Pt(0)

    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run('内部培训资料  |  天马智擎 V1.0  |  ')
    set_run(r, size=9, color=MUTED)
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), 'PAGE')
    p._p.append(fld)


def cover(doc, kicker, title, subtitle, meta):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(120)
    p.paragraph_format.space_after = Pt(18)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(kicker)
    set_run(r, size=12, bold=True, color=BLUE)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(title)
    set_run(r, size=30, bold=True, color='203748')
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(subtitle)
    set_run(r, size=15, color=DARK_BLUE)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(36)
    p.paragraph_format.space_after = Pt(0)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(meta)
    set_run(r, size=10.5, color=MUTED)
    doc.add_page_break()


def add_para(doc, text, bold_prefix=None, color=None, after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    if bold_prefix and text.startswith(bold_prefix):
        r = p.add_run(bold_prefix)
        set_run(r, size=11, bold=True, color=color)
        r = p.add_run(text[len(bold_prefix):])
        set_run(r, size=11, color=color)
    else:
        r = p.add_run(text)
        set_run(r, size=11, color=color)
    return p


def add_callout(doc, label, text, fill=LIGHT_BLUE, label_color=BLUE):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360], indent_dxa=120)
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(f'{label}  ')
    set_run(r, size=10.5, bold=True, color=label_color)
    r = p.add_run(text)
    set_run(r, size=10.5, color='333333')
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_steps(doc, steps):
    for idx, (title, text) in enumerate(steps, start=1):
        p = doc.add_paragraph(style='Heading 3')
        r = p.add_run(f'{idx}. {title}')
        set_run(r, size=12, bold=True, color=DARK_BLUE)
        add_para(doc, text)


def add_image(doc, filename, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run()
    r.add_picture(str(ASSET / filename), width=Inches(5.8))
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(10)
    r = p.add_run(caption)
    set_run(r, size=9, color=MUTED, italic=True)


def add_two_col_table(doc, headers, rows, widths=(2500, 6860)):
    table = doc.add_table(rows=1, cols=2)
    table.style = 'Table Grid'
    set_table_geometry(table, list(widths), indent_dxa=120)
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_shading(cell, LIGHT_GRAY)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i == 0 else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(h)
        set_run(r, size=10.5, bold=True, color=DARK_BLUE)
    for left, right in rows:
        cells = table.add_row().cells
        for i, text in enumerate((left, right)):
            p = cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i == 0 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(text)
            set_run(r, size=10.5)
    set_table_geometry(table, list(widths), indent_dxa=120)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_check_table(doc, items):
    table = doc.add_table(rows=1, cols=2)
    table.style = 'Table Grid'
    set_table_geometry(table, [900, 8460], indent_dxa=120)
    set_cell_shading(table.rows[0].cells[0], LIGHT_GRAY)
    set_cell_shading(table.rows[0].cells[1], LIGHT_GRAY)
    for i, text in enumerate(('完成', '检查项')):
        p = table.rows[0].cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i == 0 else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(text)
        set_run(r, size=10.5, bold=True, color=DARK_BLUE)
    for item in items:
        cells = table.add_row().cells
        p = cells[0].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run('□')
        set_run(r, size=14, color=BLUE)
        p = cells[1].paragraphs[0]
        r = p.add_run(item)
        set_run(r, size=10.5)
    set_table_geometry(table, [900, 8460], indent_dxa=120)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def build_manual():
    doc = Document()
    setup_doc(doc, '天马智擎平台使用说明')
    cover(doc, '内部培训资料 · V1.0', '天马智擎平台使用说明', '首页对话 · 工作台 · 仪表盘 · 知识中心', '适用于上线培训与上线前验证｜计划下周上线')

    doc.add_heading('1. 培训目标与平台定位', level=1)
    add_para(doc, '天马智擎是公司自研的智能工作平台。第一版聚焦员工高频场景：通过首页对话完成问答、写作、总结、联网查询和办公任务；通过工作台统一进入企业系统；通过仪表盘查看经营指标；通过知识中心管理、检索和复用内部知识。')
    add_callout(doc, '培训目标', '学会四个入口、掌握清晰提问和指标阅读方法、了解安全边界，并能够提交可复现、可行动的反馈。')

    doc.add_heading('1.1 为什么要自研', level=2)
    add_two_col_table(doc, ('价值', '说明'), [
        ('降低数据外部流转风险', '将智能能力放在企业可管理边界内，结合身份、权限和治理要求使用。'),
        ('打通内部系统', '逐步连接办公场景、企业系统与知识资产，减少切换和重复录入。'),
        ('贴合公司流程', '根据真实业务优先级优化能力，而不是被外部产品路线限制。'),
        ('持续迭代', '问题、建议和优秀案例都能转化为下一版优化依据。'),
    ])
    add_callout(doc, '重要边界', '平台内控不等于“任何数据都可以上传”。仍需遵守数据分级、最小权限、保密和业务审核要求。', fill='FFF4DD', label_color=GOLD)

    doc.add_page_break()
    doc.add_heading('1.2 四个入口怎么选', level=2)
    add_two_col_table(doc, ('入口', '适用场景'), [
        ('首页对话', '问答、写作、总结、文件处理、联网查询，以及钉钉消息、待办、日程等常用任务。'),
        ('工作台', '搜索并进入已授权的企业系统；具体入口随账号权限和后台配置变化。'),
        ('仪表盘', '按事业部和时间范围查看利润、销售、成本等经营指标，并进行同比、环比观察。'),
        ('知识中心', '管理公共/个人知识、上传文件、建立文件夹，并通过“小智问答”检索资料。'),
    ])
    add_callout(doc, '选择原则', '先判断当前任务是要产出、办理、判断，还是查知识，再选择对应入口。')
    doc.add_page_break()
    doc.add_heading('2. 首页对话', level=1)
    add_image(doc, '01_home_chat.png', '图 1｜首页对话：输入区、场景切换、附件入口与快捷任务')
    doc.add_heading('2.1 基本操作', level=2)
    add_steps(doc, [
        ('选择场景', '选择“日常办公”或“联网查询”；也可以点击发消息、建待办、建日程、查日程、查知识库、网络查询等快捷卡片。'),
        ('输入任务', '在输入框中说明要解决的问题；需要处理文件时点击左下角“添加附件”。上传前先确认资料权限与必要性。'),
        ('发送并继续追问', '查看初步结果后，可以要求补充、压缩、换格式或纠正方向。重要事实、数字和对外内容必须人工复核。'),
    ])

    doc.add_heading('2.2 提问公式：背景 + 任务 + 要求 + 格式', level=2)
    add_two_col_table(doc, ('要素', '怎么写'), [
        ('背景', '我在做什么、面向谁、已有材料是什么。'),
        ('任务', '用明确动词描述：总结、比较、改写、提取、生成。'),
        ('要求', '说明重点、口径、语气、长度、时间范围和不能做什么。'),
        ('格式', '指定输出为清单、表格、邮件、汇报提纲或行动项。'),
    ])
    add_callout(doc, '示例', '我正在准备面向一线同事的上线通知。请基于以下要点改写为 200 字以内的通知，语气清晰友好，包含上线时间、适用范围和反馈方式，并用三段式输出。')

    doc.add_heading('2.3 常见办公示例', level=2)
    add_two_col_table(doc, ('需求', '推荐写法'), [
        ('会议纪要', '请把以下记录整理为：结论、行动项、负责人、截止时间；不确定内容单独列出。'),
        ('邮件改写', '请将以下邮件改为正式、简洁的内部通知，保留关键数字与时间，不新增事实。'),
        ('文件总结', '请总结附件第 1—3 章，输出五条要点，并标注需要人工核验的内容。'),
        ('知识检索', '在知识库中查找与“关键词”相关的有效资料，按来源和更新时间整理。'),
    ])

    doc.add_page_break()
    doc.add_heading('3. 工作台', level=1)
    add_image(doc, '02_workbench.png', '图 2｜工作台：企业系统入口与搜索区域（测试账号状态）')
    doc.add_heading('3.1 基本操作', level=2)
    add_steps(doc, [
        ('进入工作台', '在顶部导航点击“工作台”。'),
        ('查找系统', '在搜索框输入系统名称，或从已授权列表中选择。'),
        ('进入办理', '打开系统后按原系统权限和流程完成业务操作。'),
    ])
    add_callout(doc, '当前测试状态', '截图中的测试账号显示“暂无可用业务系统”。正式环境可见入口以实际账号授权为准。')
    doc.add_heading('3.2 看不到系统入口怎么办', level=2)
    add_steps(doc, [
        ('点击刷新', '先排除页面数据未更新。'),
        ('确认账号和预期系统', '核对是否登录了正确账号，以及该账号是否应拥有相应权限。'),
        ('提交排查信息', '仍为空时，提供账号、发生时间、预期系统名称和页面截图给管理员。'),
    ])

    doc.add_page_break()
    doc.add_heading('4. 仪表盘', level=1)
    add_image(doc, '04_dashboard.png', '图 3｜仪表盘：事业部、时间范围、指标配置与财务指标卡片')
    doc.add_heading('4.1 基本操作', level=2)
    add_steps(doc, [
        ('选择组织范围', '通过“全部事业部”选择自己有权限查看的组织范围；可见内容以账号权限为准。'),
        ('选择时间范围', '可切换今日、昨日、本月、上月，也可以使用开始日期和结束日期自定义范围。'),
        ('阅读指标卡片', '先看指标值，再看同比和环比；上升或下降不等同于好或坏，需要结合指标定义和业务背景判断。'),
        ('调整指标', '有权限的用户可通过“指标配置”调整关注项；培训中不要随意修改公共配置。'),
    ])
    add_callout(doc, '口径提示', '仪表盘用于快速观察经营信号，不替代财务结算、审批或正式经营分析。对外使用前应确认数据刷新时间、统计口径与权限范围。', fill='FFF4DD', label_color=GOLD)
    doc.add_heading('4.2 推荐阅读顺序', level=2)
    add_two_col_table(doc, ('步骤', '关注点'), [
        ('筛选', '事业部、日期范围是否正确。'),
        ('读数', '当前值、单位和指标分类。'),
        ('对比', '同比看长期变化，环比看近期变化。'),
        ('追溯', '异常信号回到权威报表或业务系统核验。'),
    ])

    doc.add_page_break()
    doc.add_heading('5. 知识中心', level=1)
    add_image(doc, '03_knowledge_center.png', '图 4｜知识中心：知识库列表、上传文件、新建文件夹与小智问答')
    doc.add_heading('5.1 三个核心动作', level=2)
    add_steps(doc, [
        ('上传文件', '选择正确知识库后上传可共享资料。培训演示请使用测试资料，不上传生产敏感文件。'),
        ('新建文件夹', '按项目、部门、主题或年份建立清晰结构。'),
        ('小智问答', '基于知识库提问；制度、合同、参数等重要结论应回看权威原文。'),
    ])
    add_callout(doc, '权限提示', '公共空间与个人空间的可见范围不同。上传前确认资料归属、所有者、共享范围和有效版本。', fill='FFF4DD', label_color=GOLD)

    doc.add_heading('5.2 知识整理规范', level=2)
    add_two_col_table(doc, ('项目', '建议'), [
        ('文件命名', '主题_版本_日期，例如“采购流程_V1.2_20260803”。'),
        ('目录结构', '优先按项目/部门/主题组织，避免层级过深。'),
        ('版本管理', '只保留明确有效版本；过期资料标注或移除。'),
        ('维护责任', '逐步明确知识库所有者和更新频率。'),
        ('问答复核', '回答用于定位和理解；关键结论回到原文件确认。'),
    ])

    doc.add_heading('5.3 知识使用闭环', level=2)
    add_steps(doc, [
        ('整理', '确认密级、所有者、共享范围和有效版本。'),
        ('上传', '放入正确知识库和文件夹，使用可检索的文件名。'),
        ('提问', '说明主题、时间、对象和希望得到的输出。'),
        ('复核', '回到权威原文；发现过期资料及时更新。'),
    ])

    doc.add_page_break()
    doc.add_heading('6. 安全合规与结果复核', level=1)
    add_two_col_table(doc, ('建议做', '不要做'), [
        ('用于起草、总结、结构化、检索与方案启发。', '上传无权访问或不应扩散的敏感资料。'),
        ('上传前确认资料权限和必要性。', '把 AI 回答当成制度、合同或最终审批结论。'),
        ('重要结果核对事实、数字、口径与来源。', '未经复核直接对外发送。'),
        ('对外发布前完成业务与合规审核。', '用“系统不好用”替代可复现的问题描述。'),
    ], widths=(4680, 4680))
    add_callout(doc, '一句话原则', 'AI 提效，使用人负责；内部可控，权限边界仍然有效。')

    doc.add_heading('7. 第一版与反馈机制', level=1)
    add_para(doc, '目前系统是第一版，能力、体验和内部系统覆盖仍有不完善之处。希望大家积极使用，并提供正向、具体、可行动的反馈，帮助我们按真实业务价值持续迭代。')
    add_two_col_table(doc, ('反馈要素', '示例'), [
        ('使用场景', '“在知识中心查询最新采购流程”'),
        ('操作步骤', '从哪个入口进入、点击了什么、输入了什么。'),
        ('期望结果', '希望出现什么内容或完成什么动作。'),
        ('实际结果', '实际出现的页面、提示或回答。'),
        ('时间与截图', '发生时间、页面截图；必要时附会话链接。'),
        ('业务价值', '影响哪些岗位、频率多高、为什么应优先优化。'),
    ])
    add_callout(doc, '也欢迎优秀案例', '分享有效提示词、节省时间的工作场景和可复用方法，帮助更多同事用好平台。')

    doc.add_heading('8. 上线前练习清单', level=1)
    add_check_table(doc, [
        '完成一次首页对话，并至少追问一次。',
        '使用“背景 + 任务 + 要求 + 格式”改写一条提示词。',
        '查看工作台是否有自己应访问的系统入口。',
        '在仪表盘完成一次事业部或时间范围筛选，并说明一个指标的当前值、同比和环比。',
        '在知识中心找到公共空间与个人空间。',
        '完成一次知识检索或小智问答，并回看原文。',
        '能够按“场景 / 步骤 / 期望 / 实际 / 时间 / 截图”提交反馈。',
    ])

    doc.add_heading('9. 快速问题排查', level=1)
    add_two_col_table(doc, ('现象', '先做什么'), [
        ('发送按钮不可用', '确认输入框已有内容，页面未处于加载状态。'),
        ('回答方向不对', '补充背景、限制条件和输出格式，并明确指出要保留/删除的内容。'),
        ('工作台无入口', '点击刷新，核对账号权限；仍异常时提交账号、时间和截图。'),
        ('仪表盘数据异常', '先核对事业部、日期和指标口径；再记录时间、截图并向数据责任人确认。'),
        ('知识库找不到文件', '确认公共/个人空间、文件夹、文件名和访问权限。'),
        ('回答与原文冲突', '以权威原文件为准，并反馈知识可能过期或重复。'),
    ])

    doc.core_properties.title = '天马智擎平台使用说明'
    doc.core_properties.subject = '上线培训与平台使用手册'
    doc.core_properties.author = '天马智擎项目组'
    doc.save(MANUAL)


SLIDES = [
    ('开场：天马智擎平台使用培训', '大家好，今天我们一起熟悉天马智擎平台第一版。培训聚焦四个入口：首页对话、工作台、仪表盘和知识中心。今天不只是讲按钮在哪里，更希望大家知道哪些工作适合交给智擎、怎样提问效果更好、怎样阅读指标、怎样在安全合规前提下使用，以及遇到问题如何反馈。', '展示封面，说明培训后有现场练习和答疑。'),
    ('今天带走三件事：会用、用好、敢反馈', '今天的目标可以浓缩为三个词：会用、用好、敢反馈。会用，是知道三个入口分别解决什么问题；用好，是把任务说清楚，并对重要结果进行核验；敢反馈，是识别第一版不足，提供可复现、可行动的建议。', '邀请学员记下一个自己最想尝试的工作场景。'),
    ('为什么要自研', '为什么选择自研？第一是数据安全和权限可控，减少业务数据在多个外部工具间流转。第二是打通内部系统，让对话、办公、企业系统和知识资产形成连续链路。第三是持续迭代，可以根据真实业务优先级优化。需要强调：平台在企业边界内，不代表任何敏感数据都可以随意上传，原有数据分级和权限要求仍然有效。', '在“安全”处稍作停顿，避免学员形成“内部平台即可随意上传”的误解。'),
    ('四个入口的工作链路', '首页对话解决“我想知道什么、我想产出什么”；工作台解决“我要进入哪个企业系统办理”；仪表盘解决“关键经营指标发生了什么变化”；知识中心解决“资料如何沉淀、以后如何快速找到”。', '用一个真实但不敏感的工作例子串起四个入口。'),
    ('首页对话：从一句清晰任务开始', '首页输入区可以选择日常办公和联网查询，左侧加号用于添加附件，下面的快捷卡片覆盖发消息、建待办、建日程、查日程、查知识库和网络查询等任务。操作顺序是先选场景、再说明任务、必要时补充附件，提交后继续追问并复核。', '现场演示一个低风险示例；不要上传真实敏感资料。'),
    ('好结果来自四个信息', '一个好提示词包括背景、任务、要求和格式。先说背景，让系统知道你在做什么；再用明确动词说明任务；然后给出口径、语气、长度等要求；最后指定输出格式。结果不理想时，可以继续追问和修正，不必每次从头开始。', '把一条模糊提示词现场改写为四要素提示词。'),
    ('工作台：统一找到已授权的企业系统', '工作台是企业系统统一入口。进入后可以搜索或从已授权列表直接打开。当前测试账号显示“暂无可用业务系统”，不代表功能不存在，入口随权限和后台配置变化。如果看不到预期系统，先刷新，再提交账号、时间、预期系统和截图给管理员。', '指出截图为测试账号状态，正式环境以实际授权为准。'),
    ('仪表盘：先筛选，再读数、对比和追溯', '仪表盘当前展示财务指标。先确认事业部和日期范围，再看指标当前值，并结合同比和环比判断变化。需要提醒大家：上升或下降不一定代表好或坏，必须结合指标口径和业务背景。仪表盘用于发现信号，正式结论仍要回到权威报表或业务系统核验。', '现场切换本月与上月，示范读取一个指标；不要修改公共指标配置。'),
    ('知识中心：资料可管理、可检索、可复用', '知识中心可以上传文件、新建文件夹，并通过小智问答使用知识。公共空间和个人空间可见范围不同，上传前要确认归属与权限。文件命名要包含主题、版本和日期；重要答案要回到原文核对。', '演示时使用测试资料，不要使用生产敏感文件。'),
    ('知识使用闭环', '知识中心不是上传成功就结束。完整闭环是整理、上传、提问、复核。资料过期、重复或权限错误会直接影响问答结果，因此要逐步明确知识库所有者和更新机制。', '强调知识质量决定问答上限。'),
    ('放心使用，但不要放弃判断与责任', '平台适合用于起草、总结、结构化、检索和方案启发。不要上传无权访问的敏感资料，不要把回答当成制度或审批结论，不要未经复核直接对外发送。一句话原则：AI提效，使用人负责；内部可控，权限边界仍然有效。', '可请学员举例判断一个场景是否适合直接使用。'),
    ('第一版需要真实使用与具体反馈', '我们承认第一版在能力、体验和系统覆盖上仍有不完善。希望大家积极使用并提供正向反馈。高质量反馈要包含场景、步骤、期望、实际、时间和截图；建议还要说明业务价值与优先级。优秀案例同样值得反馈。', '展示标准反馈模板，说明正式反馈渠道由培训组织方补充。'),
    ('结束与行动', '请大家完成三个动作：发起一次真实但低风险的首页对话；查看自己的工作台是否有应有入口；在知识中心完成一次检索或问答。第一版的价值要靠真实使用验证，下一版的方向也要靠大家反馈决定。谢谢大家，接下来进入现场练习和答疑。', '切换到现场练习；预留答疑时间。'),
]


def build_script():
    doc = Document()
    setup_doc(doc, '天马智擎平台培训讲稿')
    cover(doc, '讲师专用 · 与培训 PPT 对应', '天马智擎平台培训讲稿', '13 页逐页讲稿与演示提示', '建议总时长 38—45 分钟（含演示与答疑）')

    doc.add_heading('培训安排', level=1)
    add_two_col_table(doc, ('环节', '建议时长'), [
        ('开场与自研背景', '8 分钟'),
        ('四个模块与现场演示', '22 分钟'),
        ('安全边界与反馈机制', '8 分钟'),
        ('练习与答疑', '6 分钟以上'),
    ])
    add_callout(doc, '讲师提醒', '正式培训前确认测试环境可访问、演示账号权限正常、示例资料不含敏感信息，并准备一条低风险演示任务。')

    for idx, (title, talk, action) in enumerate(SLIDES, start=1):
        if idx > 1:
            doc.add_page_break()
        doc.add_heading(f'第 {idx} 页｜{title}', level=1)
        doc.add_heading('讲稿', level=2)
        add_para(doc, talk)
        doc.add_heading('演示 / 控场提示', level=2)
        add_callout(doc, '提示', action)
        if idx in (3, 11):
            add_callout(doc, '必须强调', '平台自研与内部可控用于降低风险和打通内部系统，但不取消数据分级、最小权限、保密和人工复核责任。', fill='FFF4DD', label_color=GOLD)
        if idx == 12:
            doc.add_heading('推荐反馈模板', level=2)
            add_two_col_table(doc, ('字段', '填写内容'), [
                ('场景', '当时要完成什么工作。'),
                ('步骤', '从哪个入口进入、点击了什么、输入了什么。'),
                ('期望 / 实际', '希望发生什么，实际发生了什么。'),
                ('时间 / 截图', '发生时间、页面截图或会话链接。'),
                ('价值 / 优先级', '影响范围、使用频率和希望优化的优先级。'),
            ])

    doc.add_page_break()
    doc.add_heading('现场练习建议', level=1)
    add_check_table(doc, [
        '学员用四要素改写一条模糊提示词。',
        '学员完成一次首页对话并继续追问。',
        '学员检查工作台入口是否与权限预期一致。',
        '学员在仪表盘完成一次筛选，并说出一个指标的当前值、同比和环比。',
        '学员在知识中心完成一次检索并回看原文。',
        '学员用标准模板提交一条模拟反馈。',
    ])
    add_callout(doc, '收尾话术', '平台第一版需要真实业务使用。请大家多用、善用、及时反馈，我们会根据业务价值持续迭代优化。')

    doc.core_properties.title = '天马智擎平台培训讲稿'
    doc.core_properties.subject = '培训PPT逐页讲稿与演示提示'
    doc.core_properties.author = '天马智擎项目组'
    doc.save(SCRIPT)


if __name__ == '__main__':
    build_manual()
    build_script()
    print(MANUAL)
    print(SCRIPT)
