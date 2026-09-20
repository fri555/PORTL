from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path('/Users/richelleshi/workspace/portal/training_materials_v2')
IMG = ROOT / 'screenshots' / 'annotated'
OUT_SCRIPT = ROOT / '天马智擎平台培训讲稿.docx'
OUT_GUIDE = ROOT / '天马智擎平台系统使用说明.docx'

BLUE = '1677FF'
RED = 'E53935'
DARK = '111827'
GRAY = '667085'
LIGHT = 'F4F6F8'

def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), fill)
    tc_pr.append(shd)

def set_cell_text(cell, text, bold=False, color=DARK, size=9):
    cell.text = ''
    p = cell.paragraphs[0]
    r = p.add_run(text)
    r.bold = bold
    r.font.name = 'Microsoft YaHei'
    r._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
    r.font.size = Pt(size)
    r.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def configure(doc, title, subtitle, doc_type):
    sec = doc.sections[0]
    sec.top_margin = Inches(0.65)
    sec.bottom_margin = Inches(0.65)
    sec.left_margin = Inches(0.72)
    sec.right_margin = Inches(0.72)
    styles = doc.styles
    normal = styles['Normal']
    normal.font.name = 'Microsoft YaHei'
    normal._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(DARK)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.28
    for name, size, color in [('Title', 32, DARK), ('Heading 1', 22, DARK), ('Heading 2', 16, BLUE), ('Heading 3', 12, DARK)]:
        st = styles[name]
        st.font.name = 'Microsoft YaHei'
        st._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = RGBColor.from_string(color)
    styles['Heading 1'].paragraph_format.space_before = Pt(4)
    styles['Heading 1'].paragraph_format.space_after = Pt(10)
    styles['Heading 2'].paragraph_format.space_before = Pt(10)
    styles['Heading 2'].paragraph_format.space_after = Pt(5)
    # Header/footer inspired by compact reference / workshop agenda presets.
    header = sec.header.paragraphs[0]
    header.text = f'TIANMA  ·  {doc_type}'
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    header.runs[0].font.size = Pt(8)
    header.runs[0].font.color.rgb = RGBColor.from_string(GRAY)
    footer = sec.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run('天马智擎 V1 · 内部培训材料  |  ')
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), 'PAGE')
    footer._p.append(fld)
    for r in footer.runs:
        r.font.size = Pt(8)
        r.font.color.rgb = RGBColor.from_string(GRAY)
    # Cover
    p = doc.add_paragraph()
    p.space_after = Pt(40)
    r = p.add_run('TIANMA · AI WORKBENCH')
    r.bold = True; r.font.size = Pt(11); r.font.color.rgb = RGBColor.from_string(BLUE)
    doc.add_heading(title, 0)
    p = doc.add_paragraph(subtitle)
    p.style = doc.styles['Subtitle']
    p.runs[0].font.name = 'Microsoft YaHei'; p.runs[0]._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
    p.runs[0].font.size = Pt(17); p.runs[0].font.color.rgb = RGBColor.from_string(GRAY)
    doc.add_paragraph('\n')
    meta = doc.add_table(rows=4, cols=2)
    meta.alignment = WD_TABLE_ALIGNMENT.LEFT
    meta.autofit = False
    vals = [('版本', 'V1 培训版'), ('适用对象', '天马内部员工 / 业务负责人 / 培训讲师'), ('培训范围', '首页智能体、知识中心、仪表盘、工作台'), ('界面基准', '测试环境实测；截图 1440×900；课件 1920×1080')]
    for i,(k,v) in enumerate(vals):
        set_cell_text(meta.cell(i,0), k, True, BLUE, 9)
        set_cell_text(meta.cell(i,1), v, False, DARK, 9)
        set_cell_shading(meta.cell(i,0), 'EEF4FF')
        meta.cell(i,0).width = Inches(1.25); meta.cell(i,1).width = Inches(5.8)
    doc.add_paragraph('\n内部使用提示：培训中演示的数据、知识库和系统入口应使用已批准的测试内容；页面能力以发版当日生产环境为准。')
    doc.add_page_break()

def add_toc(doc):
    doc.add_heading('目录', 1)
    p = doc.add_paragraph()
    run = p.add_run()
    fld = OxmlElement('w:fldChar'); fld.set(qn('w:fldCharType'), 'begin'); run._r.append(fld)
    instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'TOC \\o "1-3" \\h \\z \\u'; run._r.append(instr)
    fld = OxmlElement('w:fldChar'); fld.set(qn('w:fldCharType'), 'separate'); run._r.append(fld)
    run2 = p.add_run('在 Word 中右键此处，选择“更新域”生成目录。')
    run2.font.color.rgb = RGBColor.from_string(GRAY)
    run3 = p.add_run(); fld = OxmlElement('w:fldChar'); fld.set(qn('w:fldCharType'), 'end'); run3._r.append(fld)
    doc.add_page_break()

def callout(doc, title, body, color=BLUE):
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.cell(0,0); set_cell_shading(c, 'EEF4FF' if color == BLUE else 'FFF1F0')
    p = c.paragraphs[0]
    r = p.add_run(title + '  '); r.bold=True; r.font.color.rgb=RGBColor.from_string(color)
    r = p.add_run(body); r.font.color.rgb=RGBColor.from_string(DARK)
    for r in p.runs:
        r.font.name='Microsoft YaHei'; r._element.rPr.rFonts.set(qn('w:eastAsia'),'Microsoft YaHei'); r.font.size=Pt(10)
    doc.add_paragraph()

def bullets(doc, items):
    for item in items:
        p=doc.add_paragraph(style='List Bullet')
        p.add_run(item)

def steps(doc, items):
    for item in items:
        p=doc.add_paragraph(style='List Number')
        p.add_run(item)

def image(doc, name, caption):
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(IMG / f'{name}.png'), width=Inches(7.0))
    c = doc.add_paragraph(caption); c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in c.runs:
        r.italic=True; r.font.size=Pt(8.5); r.font.color.rgb=RGBColor.from_string(GRAY)

def limits_table(doc):
    tbl=doc.add_table(rows=3, cols=5)
    tbl.alignment=WD_TABLE_ALIGNMENT.CENTER
    headers=['入口','支持格式','单文件上限','单次数量','推荐用途']
    rows=[
        ['首页直接附件','pdf/doc/docx/xls/xlsx/txt/md','10MB','最多3个','临时、少量、一次性材料'],
        ['知识中心上传','pdf/doc/docx/xls/xlsx/csv/txt/md','50MB','最多100个','较大、复用、团队沉淀材料'],
    ]
    for j,h in enumerate(headers): set_cell_text(tbl.cell(0,j),h,True,'FFFFFF',8); set_cell_shading(tbl.cell(0,j),BLUE)
    for i,row in enumerate(rows,1):
        for j,v in enumerate(row): set_cell_text(tbl.cell(i,j),v,False,DARK,8); set_cell_shading(tbl.cell(i,j),'F8FAFC' if i%2 else 'FFFFFF')

def speaker(doc, text):
    p = doc.add_paragraph()
    r = p.add_run('【讲师说】')
    r.bold = True; r.font.color.rgb = RGBColor.from_string(BLUE)
    p.add_run(text)

def stage(doc, action, expected=None, boundary=None):
    p = doc.add_paragraph()
    r = p.add_run('【屏幕操作】')
    r.bold = True; r.font.color.rgb = RGBColor.from_string(RED)
    p.add_run(action)
    if expected:
        p = doc.add_paragraph()
        r = p.add_run('【预期画面】')
        r.bold = True; r.font.color.rgb = RGBColor.from_string(BLUE)
        p.add_run(expected)
    if boundary:
        p = doc.add_paragraph()
        r = p.add_run('【边界提醒】')
        r.bold = True; r.font.color.rgb = RGBColor.from_string(RED)
        p.add_run(boundary)

def build_script():
    doc=Document(); configure(doc,'天马智擎平台培训讲稿','现场可直接讲 · 含屏幕操作、预期画面与边界提醒','培训逐字讲稿'); add_toc(doc)
    callout(doc,'使用方式','蓝色“讲师说”可直接口述；红色“屏幕操作”用于现场演示；每段最后用“边界提醒”收住预期。建议总时长 60–70 分钟。')

    doc.add_heading('01 开场与背景（约 5 分钟）',1)
    speaker(doc,'大家好，今天这场培训不准备把大家带进一堆技术名词里。我们只解决四件事：这个平台能做什么，现场怎么操作，什么事情不能完全交给它，以及怎样把它接进我们真实的业务。天马智擎不是一个面向所有场景的通用聊天网站，它的定位是公司内部的 AI 工作入口。我们选择自研，核心是三个词：治理、连接、沉淀。治理，是把数据、权限和使用规范放在企业可管理的框架里，降低内部材料流向未批准外部平台的风险；连接，是逐步打通知识和内部系统；沉淀，是把个人经验变成可复用的智能体。')
    speaker(doc,'也请大家先建立一个正确预期：现在是第一版，不会一次做到完美。我们希望大家真的把它用到工作里，遇到问题不要只说“效果不好”，而是把场景、步骤和结果说清楚。后面我会演示怎么通过平台里的“问题反馈”入口，跳转到钉钉链接填写。我们的目标不是回避问题，而是用真实反馈把下一版做得更好。')
    stage(doc,'停留在培训封面，不操作系统。','学员先理解“内部工作入口”的定位。','自研不等于绝对不会泄漏；员工仍需遵守公司数据分级、权限和使用规范。')

    doc.add_heading('02 首页智能体：先认识主入口（约 5 分钟）',1)
    image(doc,'01_home_daily','图 1：首页日常办公模式——红框与箭头标出主要操作区')
    speaker(doc,'现在请大家看首页。这里是最常用的入口，先不要急着把所有按钮都记住，只记住一个动作顺序：先选模式，再给材料，然后把任务说清楚，最后提交。输入框下面可以添加附件、切换模式，也可以按需使用联网查询；下方还有发消息、建待办、建日程、查日程、查知识库、网络查询六个快捷场景。左侧会保留日常办公和专家模式的历史会话，方便继续之前的工作。')
    stage(doc,'用鼠标依次指向输入框、“+”附件、模式选择、联网查询和六个快捷场景，不提交真实任务。','学员能说出首页四个核心区域。','联网查询用于公开互联网信息，不代表自动获得公司内部数据。')

    doc.add_heading('03 两种模式的定位：横向通用 vs 纵向专业（约 8 分钟）',1)
    image(doc,'02_mode_menu','图 2：日常办公与专家模式的切换入口')
    speaker(doc,'这一页是整场培训最重要的判断题。日常办公和专家模式不是“普通版”和“高级版”，也不是答案聪明程度的简单差别，而是两条不同的任务路径。日常办公面向横向、通用、轻量的办公与协同任务。你已经知道要做什么，只希望 AI 帮你查、写、整理，或者发起消息、待办、日程这类动作，就先用日常办公。比如写一段通知、查明天的日程、把会议纪要整理成待办，都是这一类。')
    speaker(doc,'专家模式面向纵向、专业、复杂的专项业务任务。它把特定领域的方法、知识和流程封装成智能体。你面对的是一个明确的业务问题，需要按专业方法完成分析或方案，就进入专家模式。比如根据预算和人员结构生成组货方案，或者基于店铺评价数据识别高风险 SKU，这时不要让通用模式从零猜方法，而要选择匹配的专家。请大家记住一句话：日常办公解决横向通用工作，专家模式解决纵向专业任务。')
    speaker(doc,'如果一个任务两边都需要，可以串起来用：先让评价分析师找出问题线索，再回到日常办公把结论整理成汇报、消息或待办。判断顺序也很简单：第一，是不是通用办公或协同动作？是，就选日常办公。第二，是否依赖特定业务方法、专属知识或固定流程？是，就选专家模式。第三，既要专业分析又要办公落地，就先专家、后日常。')
    stage(doc,'打开模式选择菜单，先指向“日常办公”，再指向“专家模式”。现场提问：“帮我约明天下午的会议选哪个？根据预算生成组货方案选哪个？”','菜单显示两种模式；学员回答前者日常办公、后者专家模式。','模式选对只是第一步，输入材料不完整、约束不清楚，结果仍会偏。')

    doc.add_heading('04 日常办公：把通用工作做快（约 6 分钟）',1)
    speaker(doc,'先看日常办公。它最适合低门槛、高频、跨部门都能复用的任务。页面已经给出六类快捷场景：发消息、建待办、建日程、查日程、查知识库和网络查询。使用时不要只输入一个动词。比如“建日程”，至少要告诉系统时间、参与人、主题、地点或会议室；“发消息”要写清收件人和内容；“查知识库”要说明关键词、范围和希望怎样输出。越接近一个完整工作指令，结果越稳定。')
    stage(doc,'点击一个日常办公快捷场景，让模板进入输入区；补充必要信息，但在演示环境中不执行真实外发动作。','输入区出现相应任务模板或提示。','涉及发消息、建待办、建日程等外部动作，提交前必须核对对象、内容、时间，并以页面实际确认流程为准。')

    doc.add_heading('05 专家模式：按业务目标选智能体（约 5 分钟）',1)
    image(doc,'03_expert_grid','图 3：专家模式列表——重点关注能力说明，不只看名称')
    speaker(doc,'切到专家模式后，大家会看到一组智能体。选择时不要只看名字，也不要默认所有专家都适合自己的材料。先读卡片上的能力说明，再看它需要什么输入，最后判断输出能不能被验证。本次培训重点演示两个：组货专家解决方案生成，评价分析师解决评价数据分析。其他智能体是否可见、能力是否调整，可能随发版配置和账号权限变化，所以现场以页面为准。')
    stage(doc,'切换到专家模式，展示智能体列表；分别指向组货专家与评价分析师。','学员看到专家卡片、能力说明和选择入口。','专家输出仍是辅助结果，不能替代经营、财务、合规和客户沟通中的责任人判断。')

    doc.add_heading('06 演示一：组货专家（约 8 分钟）',1)
    image(doc,'04_group_expert','图 4：组货专家——能力说明与快速初始化模板')
    speaker(doc,'组货专家的定位很明确：根据预算、人数、性别比例和品类需求，匹配知识库方案与商品信息，生成可执行的组货方案。这里最常见的错误，是只说一句“帮我组货”。系统不知道预算、不知道人数，也不知道品类约束，只能做大量假设。更好的说法是：预算 20 万元，服务 300 人，男女比例 6 比 4，重点是运动上装和鞋类，优先参考我引用的商品清单和历史方案；输出预算分配、SKU、数量、理由、风险和待确认项。')
    speaker(doc,'结果出来以后先别急着复制。我们至少核对四件事：总金额有没有超预算，数量是否匹配人数，SKU 是否来自有效材料，系统做了哪些假设。季节、价格带、品牌偏好、库存和交期这些信息，能补就补。AI 的价值是快速形成一个可讨论的初稿，最终方案仍要由业务人员结合库存、交期和实际政策确认。')
    stage(doc,'选择组货专家，点击快速初始化模板，填入演示条件；如使用文件，引用已批准的测试商品清单。','输入区呈现完整约束，系统生成结构化组货建议。','不要使用真实敏感数据；不要把未经核实的 SKU、库存和价格直接用于执行。')

    doc.add_heading('07 演示二：评价分析师（约 7 分钟）',1)
    image(doc,'05_eval_expert','图 5：评价分析师——五类快捷分析')
    speaker(doc,'评价分析师专注天马 B2C 平台店铺评价数据的分析和报告生成。页面提供五类快捷任务：评价全景、差评聚焦、品牌表现、高风险 SKU、地区或物流专项。演示时我选择差评聚焦，并要求它按问题类型、品牌、SKU、地区和物流归类，列出高频问题、影响范围、典型证据、优先级和建议动作。最后再加一句：数据不足时明确说明，不要补造数字。')
    speaker(doc,'这里的边界也要说清。系统适合做归类、总结和发现线索，但它不知道每一笔异常订单背后的真实责任。样本是否完整、字段是否准确、某个差评是否属于偶发事件，都需要业务同事回到原始数据核查。所以专家模式可以帮助我们更快找到该看哪里，但不能替代最终判断。')
    stage(doc,'选择评价分析师，点击一个快捷任务，引用测试评价数据后发起分析。','结果按指定维度组织，并提示数据不足或待核查项。','重要比例、数量和责任结论必须回查原始评价与订单数据。')

    doc.add_heading('08 两条材料路径：别混淆 10MB 与 50MB（约 5 分钟）',1)
    image(doc,'06_attachment_local','图 6：首页直接附件——单文件不超过 10MB，最多 3 个')
    image(doc,'07_knowledge_picker','图 7：首页从知识中心引用已处理文件')
    speaker(doc,'材料有两条路径。临时、少量、一次性使用的文件，可以直接在首页上传，支持常见文档和表格格式，单文件不超过 10MB，最多 3 个。如果文件更大、以后还要反复用，或者需要团队沉淀，就先放到知识中心。知识中心单文件不超过 50MB，单次最多 100 个，并且额外支持 CSV。请大家一定把两组数字分开记：首页是 10MB 和 3 个；知识中心是 50MB 和 100 个。')
    limits_table(doc)
    stage(doc,'点击首页“+”，分别展示“本地上传”和“知识中心”入口。','学员能区分两条材料路径。','知识中心上传完成后还要等待“处理成功”，否则首页可能选不到或回答不完整。')

    doc.add_heading('09 知识中心：上传、处理、问答（约 10 分钟）',1)
    image(doc,'08_knowledge_list','图 8：知识中心——上传文件、新建文件夹、小智问答')
    image(doc,'09_kb_inside','图 9：知识库内部——确认文件状态为“处理成功”')
    image(doc,'10_kb_upload','图 10：知识中心上传限制')
    speaker(doc,'进入知识中心后，先确认要把文件放在哪个空间、哪个知识库。不要为了方便把不该共享的材料放进公共位置。点击上传文件后，检查格式、50MB 单文件上限和单次 100 个的数量上限。这里最重要的一句话是：上传完成不等于解析完成。请等文件状态变成“处理成功”，再做小智问答，或者回首页引用。')
    stage(doc,'进入目标知识库，点击“上传文件”，展示限制；关闭弹窗后指向文件状态“处理成功”和“小智问答”。','学员理解上传、解析和可问答是三个连续阶段。','表格复杂、文件较大时处理与回答可能更慢；关键数字仍需回查原文件。')

    doc.add_heading('10 仪表盘：先定范围，再看趋势（约 7 分钟）',1)
    image(doc,'11_dashboard','图 11：仪表盘——事业部、时间范围、指标卡')
    image(doc,'12_dashboard_config','图 12：指标配置——15 项指标')
    speaker(doc,'仪表盘当前展示财务指标。正确顺序不是一打开就看涨跌，而是先选事业部，再选今日、昨日、本月、上月或自定义时间，最后看当前值、同比和环比。红色或绿色只是提示，真正解释还要结合指标口径、基期和业务背景。指标配置里现在有 15 项：利润 4 项、销售 4 项、成本 7 项，可以选择需要展示的指标并保存。')
    stage(doc,'切换一个时间范围；打开“指标配置”，展示三组 15 项指标后关闭。','筛选条件变化，配置面板显示可选指标。','当前已核对的是筛选和指标配置；不要承诺尚未验证的导出、下钻等能力。')

    doc.add_heading('11 工作台：统一入口，不等于全部打通（约 4 分钟）',1)
    image(doc,'13_workbench','图 13：工作台——搜索系统入口，列表随权限变化')
    speaker(doc,'工作台的定位很简单：把内部系统入口集中到一个地方，减少大家到处找链接。可以用顶部搜索定位系统。当前测试账号看到 10 个入口，但不同员工看到的列表可能不同，因为它受账号权限和管理员配置影响。还要注意，工作台是统一入口，不代表每一个系统都已经能被首页对话直接调用。能看见入口、能进入系统、能被智能体调用，是三个不同层级的能力。')
    stage(doc,'在顶部搜索框输入一个系统名称并定位卡片，不进入生产业务系统。','搜索结果缩小到目标入口。','看不到入口时先确认权限或配置，不要据此判断系统故障。')

    doc.add_heading('12 模块耦合：知识中心 → 首页对话（约 5 分钟）',1)
    speaker(doc,'现在把前面的模块串成一个真正的工作流。第一步，把较大或需要复用的文件上传到正确知识库；第二步，等状态变成处理成功；第三步，回到首页点击加号，切换到知识中心；第四步，选择空间、知识库和文件；第五步，根据任务选模式。通用整理用日常办公，专业分析用对应专家；最后按“目标、材料、约束、输出”提问并人工复核。')
    stage(doc,'按上述五步完整走一遍，使用测试文件，不执行外部发送。','学员看到知识文件被首页引用，并进入正确模式。','引用成功不等于结论正确；重要事实、数字和业务动作仍需人工确认。')

    doc.add_heading('13 怎么用好工具与能力边界（约 4 分钟）',1)
    speaker(doc,'无论使用哪种模式，都建议用四段式写任务：目标是要解决什么问题；材料是参考哪些文件或公开信息；约束是预算、范围、时间、规则和不能做什么；输出是表格、报告还是行动清单。最后再加一句验证要求，比如“列出引用依据”“数据不足时明确说明”。这比反复说“再详细一点”更有效。')
    speaker(doc,'同时请守住五条边界：AI 可能出错或遗漏；没有提供、授权或接入的数据不会自动获得；敏感信息要遵守公司规范；外部发送、审批、下单和承诺前必须人工确认；V1 的入口、限额和体验可能继续迭代。把 AI 当成加速器，而不是免责替代。')

    doc.add_heading('14 问题反馈与 QA（约 8–10 分钟）',1)
    speaker(doc,'最后说一下问题反馈。大家在使用中遇到问题，请点击平台里的“问题反馈”入口，页面会跳转到钉钉链接，在钉钉中填写并提交。为了让研发能够复现，建议写清七项：业务场景、选择的模式或智能体、引用材料、操作步骤、期望结果、实际结果，以及截图、时间和影响范围。这样我们才能判断问题发生在哪里，也能更快安排迭代。')
    speaker(doc,'天马智擎现在是第一版，我们欢迎正向反馈，不是只报喜，而是具体、客观、可复现。什么地方好用，请告诉我们为什么；什么地方不好用，也请告诉我们在哪个场景、哪一步出现了偏差。真实使用会帮助我们把功能、体验和内部系统连接做得更贴近业务。接下来进入 QA，现场不能确认的问题我们记录下来，不猜答案，后续通过钉钉反馈链路跟进。')
    stage(doc,'点击平台中的“问题反馈”入口，展示跳转到钉钉链接；不要在培训中提交测试反馈。','浏览器或钉钉打开反馈填写页面。','反馈中不要附带超出处理所需范围的敏感数据；截图前先做必要脱敏。')
    qa=[('什么时候用日常办公？','通用、轻量、跨部门可复用的写作、查询和协同任务。'),('什么时候用专家模式？','依赖专业方法、专属知识或固定业务流程的复杂专项任务。'),('首页为什么选不到知识文件？','检查“处理成功”、空间、知识库、文件名和权限。'),('为什么同事的工作台入口不同？','账号权限和管理员配置不同。')]
    for q,a in qa:
        p=doc.add_paragraph(); r=p.add_run('Q  '+q); r.bold=True; r.font.color.rgb=RGBColor.from_string(BLUE)
        doc.add_paragraph('A  '+a)
    doc.save(OUT_SCRIPT)

def build_guide():
    doc=Document(); configure(doc,'天马智擎平台系统使用说明','面向日常用户的快速参考与操作手册','系统使用说明'); add_toc(doc)
    doc.add_heading('1. 使用前准备',1)
    bullets(doc,['使用公司授权账号登录；入口、知识库与系统权限因账号而异。','准备合规的测试或业务材料；不上传无权限或不应进入系统的数据。','确认浏览器网络正常；功能以发版当日正式环境为准。'])
    doc.add_heading('2. 首页智能对话',1)
    image(doc,'01_home_daily','首页主要功能区域')
    steps(doc,['在输入框说明任务。','按需点击“+”添加附件。','选择“日常办公”或“专家模式”。','需要外部公开信息时开启“联网查询”。','提交后检查结果中的事实、数字和来源。'])
    doc.add_heading('2.1 日常办公模式',2)
    callout(doc,'定位','横向、通用、轻量的办公与协同入口。适合“我知道要做什么，希望 AI 帮我查、写、整理或发起办公动作”的任务。')
    bullets(doc,['发消息：给指定花名发送钉钉消息，提交前检查收件人和内容。','建待办：提供标题、内容和截止时间。','建日程：提供参与人、园区/会议室、时间、时长和主题。','查日程：明确查询日期或范围。','查知识库：说明关键词、目标知识库和输出形式。','网络查询：说明关键词、时间范围和期望报告结构。'])
    doc.add_heading('2.2 专家模式',2)
    callout(doc,'定位','纵向、专业、复杂的专项业务入口。适合“需要按专业方法、专属知识或固定流程完成分析/方案”的任务。')
    image(doc,'03_expert_grid','专家模式列表')
    doc.add_paragraph('选择原则：先判断是否依赖专业方法，再确认任务与智能体能力说明匹配、输入材料满足要求、输出可以验证。混合任务建议“先专家分析，后日常办公整理汇报、消息或待办”。')
    doc.add_heading('组货专家',3); image(doc,'04_group_expert','组货专家与初始化模板')
    doc.add_paragraph('至少提供预算、人数、性别比例和品类需求；建议补充季节、价格带、品牌偏好、库存、交期、排除项。')
    doc.add_heading('评价分析师',3); image(doc,'05_eval_expert','评价分析师的五类快捷任务')
    doc.add_paragraph('适合评价全景、差评、品牌、高风险SKU、地区/物流分析。要求系统列出证据与数据不足项，避免无依据结论。')
    doc.add_heading('2.3 首页附件',2)
    image(doc,'06_attachment_local','首页本地附件限制')
    image(doc,'07_knowledge_picker','从知识中心引用文件')
    limits_table(doc)

    doc.add_heading('3. 知识中心',1)
    image(doc,'08_knowledge_list','知识中心列表与三个主要操作')
    doc.add_heading('3.1 上传文件',2)
    steps(doc,['进入目标知识库。','点击“上传文件”。','选择符合格式和大小要求的文件。','等待状态变为“处理成功”。'])
    image(doc,'10_kb_upload','知识中心上传限制')
    doc.add_heading('3.2 文件与问答',2)
    image(doc,'09_kb_inside','知识库内文件与处理成功状态')
    bullets(doc,['文件处理成功后再在首页引用。','小智问答可基于知识库内容和已打开文件回答。','表格类文件较大时，解析与回答可能需要更长时间；重要数字要回查原表。'])

    doc.add_heading('4. 仪表盘',1)
    image(doc,'11_dashboard','财务指标仪表盘')
    steps(doc,['先选择事业部。','选择今日/昨日/本月/上月或自定义日期范围。','阅读当前值，再结合同比和环比判断趋势。','点击“指标配置”选择需要展示的指标并保存。'])
    image(doc,'12_dashboard_config','15项可配置指标')
    callout(doc,'注意','页面实测支持筛选和指标配置；不要把尚未验证的导出、下钻等能力写入操作承诺。',RED)

    doc.add_heading('5. 工作台',1)
    image(doc,'13_workbench','工作台系统入口')
    steps(doc,['在顶部搜索框输入系统名称。','核对系统卡片名称与说明。','点击进入；如看不到所需系统，联系管理员确认权限或配置。'])
    doc.add_paragraph('当前实测账号可见 10 个系统入口，但不同员工的列表可能不同。工作台是统一入口，不代表所有系统已与首页对话自动打通。')

    doc.add_heading('6. 推荐闭环：知识中心 → 首页对话',1)
    steps(doc,['把较大或复用文件上传到知识中心。','等待“处理成功”。','回到首页，点击“+”，切换“知识中心”。','选择空间、知识库和文件。','选择日常办公或匹配的专家智能体。','用“目标—材料—约束—输出”四段式提问。','复核结果，必要时补充材料或收窄范围。'])
    limits_table(doc)

    doc.add_heading('7. 常见问题与反馈',1)
    steps(doc,['点击平台中的“问题反馈”入口。','页面跳转到钉钉链接后，在钉钉中填写并提交。','写清业务场景、模式/智能体、引用材料、操作步骤、期望与实际、截图、时间和影响范围。','涉及敏感信息时先做脱敏，只提供定位问题所需的最小信息。'])
    callout(doc,'V1 共建','请积极使用并提供正向、具体、可复现的建议。平台团队将根据反馈持续迭代功能、体验和系统连接。')
    doc.save(OUT_GUIDE)

if __name__ == '__main__':
    build_script(); build_guide()
    print(OUT_SCRIPT); print(OUT_GUIDE)
