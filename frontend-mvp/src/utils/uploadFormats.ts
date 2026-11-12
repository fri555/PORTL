/** 智能体「能力扩展」里允许上传的文件格式配置（设置页 ↔ 首页对话共享）。 */

export const ALLOWED_UPLOAD_FORMATS_KEY = 'tianma.prototype.allowed-upload-formats.v1'

export interface UploadFormatOption {
  value: string
  label: string
  group: string
}

/** 现有允许上传的文件格式。 */
export const UPLOAD_FORMAT_OPTIONS: UploadFormatOption[] = [
  { value: 'pdf', label: 'PDF 文档（.pdf）', group: '文档' },
  { value: 'doc', label: 'Word 文档（.doc）', group: '文档' },
  { value: 'docx', label: 'Word 文档（.docx）', group: '文档' },
  { value: 'txt', label: '文本文件（.txt）', group: '文档' },
  { value: 'md', label: 'Markdown（.md）', group: '文档' },
  { value: 'pptx', label: 'PPT 演示（.pptx）', group: '文档' },
  { value: 'xls', label: 'Excel 表格（.xls）', group: '表格' },
  { value: 'xlsx', label: 'Excel 表格（.xlsx）', group: '表格' },
  { value: 'csv', label: 'CSV 表格（.csv）', group: '表格' },
  { value: 'png', label: 'PNG 图片（.png）', group: '图片' },
  { value: 'jpg', label: 'JPG 图片（.jpg）', group: '图片' },
  { value: 'jpeg', label: 'JPEG 图片（.jpeg）', group: '图片' },
  { value: 'webp', label: 'WEBP 图片（.webp）', group: '图片' },
]

const OPTION_VALUES = UPLOAD_FORMAT_OPTIONS.map((option) => option.value)
export const DEFAULT_ALLOWED_FORMATS: string[] = [...OPTION_VALUES]

export function normalizeFormats(values: unknown): string[] {
  if (!Array.isArray(values)) return [...DEFAULT_ALLOWED_FORMATS]
  const normalized = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.replace(/^\./, '').trim().toLowerCase())
    .filter((value) => OPTION_VALUES.includes(value))
  return Array.from(new Set(normalized))
}

/** 首页对话读取当前允许上传的文件格式；未配置时回退到默认（含图片）。 */
export function readAllowedFormats(): string[] {
  if (typeof localStorage === 'undefined') return [...DEFAULT_ALLOWED_FORMATS]
  try {
    const raw = localStorage.getItem(ALLOWED_UPLOAD_FORMATS_KEY)
    if (raw === null) return [...DEFAULT_ALLOWED_FORMATS]
    const formats = normalizeFormats(JSON.parse(raw))
    return formats.length ? formats : [...DEFAULT_ALLOWED_FORMATS]
  } catch {
    return [...DEFAULT_ALLOWED_FORMATS]
  }
}

/** 设置页保存时写入，供首页对话读取。 */
export function writeAllowedFormats(formats: string[]): void {
  const normalized = normalizeFormats(formats)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ALLOWED_UPLOAD_FORMATS_KEY, JSON.stringify(normalized))
  } catch {
    // 原型：本地存储不可用时忽略
  }
}
