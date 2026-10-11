export interface CitationFragment {
  id: string;
  location: string;
  text: string;
}
export interface CitationSource {
  id: string;
  type: 'knowledge' | 'web';
  title?: string;
  origin?: string;
  version?: string;
  url?: string;
  publishedAt?: string;
  capturedAt?: string;
  /** Web search summary, not a saved or located copy of the webpage body. */
  summary?: string;
  access: 'allowed' | 'forbidden' | 'deleted';
  offline?: boolean;
  /** Knowledge document excerpts only. Web cards do not load or display fragments. */
  fragments: CitationFragment[];
}
export interface CitedParagraph {
  heading?: string;
  text: string;
  citations: { sourceId: string; fragmentId?: string }[];
}
export type CitationPreviewLoader = (source: CitationSource) => Promise<CitationFragment[]>;

export function safeCitationUrl(source: CitationSource) {
  if (source.access !== 'allowed' || !source.url) return '';
  try {
    const url = new URL(source.url);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}
