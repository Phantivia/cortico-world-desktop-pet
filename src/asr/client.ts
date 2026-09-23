/**
 * Audio encoding and recognition-result filtering shared by local recognizers.
 */

export interface TranscribeResult {
  text: string;
  ms: number;
  /** null on success. */
  error: string | null;
}

/** 16-bit mono PCM → WAV bytes (44-byte header + samples). */
export function wavFromPcm16(pcm: Int16Array, sampleRate: number): Uint8Array {
  const bytes = pcm.length * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const view = new DataView(buf);
  const ascii = (at: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, bytes, true);
  new Int16Array(buf, 44).set(pcm);
  return new Uint8Array(buf);
}

/**
 * Common subtitle phrases and punctuation-only output are not speech.
 */
const HALLUCINATION_PATTERNS: readonly RegExp[] = [
  /^[\s。.,、!?!?…~-]*$/,
  /字幕|谢谢观看|请不吝点赞|订阅|转发|打赏|明镜与点点栏目/,
  /^(thank you|thanks for watching|subtitles by|you)[\s.!]*$/i,
  /^[\s]*\[.*\][\s]*$/,
  /^\(.*\)$/,
  /^[\s]*（.*）[\s]*$/,
];

export function looksHallucinated(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}
