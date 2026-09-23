/** Local SenseVoice Small transcription through the portable FunASR GGUF executable. */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { wavFromPcm16, type TranscribeResult } from './client.ts';

export interface SenseVoiceState {
  phase: 'stopped' | 'running' | 'error';
  url: string;
  pid: number | null;
  detail: string | null;
}

export interface SenseVoiceOptions {
  launch: () => { exe: string; model: string } | { missing: string };
  temporaryRoot: () => string;
  timeoutMs: () => number;
  /** Tests can provide a recognizer while exercising the complete microphone flow. */
  recognize?: (pcm: Int16Array, sampleRate: number) => Promise<TranscribeResult>;
}

export class SenseVoiceRecognizer {
  private phase: SenseVoiceState['phase'] = 'stopped';
  private detail: string | null = null;
  private launchFiles: { exe: string; model: string } | null = null;
  private child: ChildProcess | null = null;

  constructor(private readonly opts: SenseVoiceOptions) {}

  state(): SenseVoiceState {
    return { phase: this.phase, url: this.launchFiles?.model ?? '', pid: this.child?.pid ?? null, detail: this.detail };
  }

  start(): void {
    const files = this.opts.launch();
    if ('missing' in files) {
      this.phase = 'error';
      this.detail = files.missing;
      this.launchFiles = null;
      return;
    }
    if (!this.opts.recognize && (!existsSync(files.exe) || !existsSync(files.model))) {
      this.phase = 'error';
      this.detail = 'SenseVoice 程序或模型文件不存在';
      this.launchFiles = null;
      return;
    }
    this.launchFiles = files;
    this.phase = 'running';
    this.detail = null;
  }

  stop(): void {
    this.child?.kill();
    this.child = null;
    this.launchFiles = null;
    this.phase = 'stopped';
    this.detail = null;
  }

  async transcribe(pcm: Int16Array, sampleRate: number): Promise<TranscribeResult> {
    const started = Date.now();
    const files = this.launchFiles;
    if (this.phase !== 'running' || !files) return { text: '', ms: 0, error: this.detail ?? 'SenseVoice 没有运行' };
    if (this.opts.recognize) return this.opts.recognize(pcm, sampleRate);

    const root = this.opts.temporaryRoot();
    mkdirSync(root, { recursive: true });
    const dir = mkdtempSync(join(root, 'speech-'));
    const audio = join(dir, 'speech.wav');
    try {
      writeFileSync(audio, wavFromPcm16(pcm, sampleRate));
      const result = await new Promise<{ text: string; error: string | null }>((resolve) => {
        const child = spawn(files.exe, ['-m', files.model, '-a', audio], {
          cwd: dirname(files.exe), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
        });
        this.child = child;
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; child.kill(); }, this.opts.timeoutMs());
        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
        child.once('error', (err) => {
          clearTimeout(timer);
          if (this.child === child) this.child = null;
          resolve({ text: '', error: `SenseVoice 启动失败：${err.message}` });
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          if (this.child === child) this.child = null;
          resolve(timedOut
            ? { text: '', error: `识别超时(${this.opts.timeoutMs()}ms)` }
            : code === 0
              ? { text: stdout.trim(), error: null }
              : { text: '', error: `SenseVoice 退出码 ${code}：${stderr.trim().slice(-300)}` });
        });
      });
      if (result.error && this.phase === 'running') {
        this.phase = 'error';
        this.detail = result.error;
      }
      return { ...result, ms: Date.now() - started };
    } finally {
      unlinkSync(audio);
      rmdirSync(dir);
    }
  }
}
