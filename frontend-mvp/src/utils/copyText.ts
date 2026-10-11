/** Bound the clipboard attempt so blocked browsers always expose the manual fallback. */
export async function copyTextWithTimeout(text: string, timeoutMs = 3000): Promise<void> {
  if (!text.trim() || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Copy timeout')), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
