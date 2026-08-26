import { prisma } from "@/lib/db";
import type { SubtitleStyle } from "@/lib/generated/prisma/client";

export interface SubtitleEntry {
  text: string;
  startTime: number;
  endTime: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

export class SubtitleService {
  async generateFromScenes(
    projectId: string,
    scenes: Array<{
      id: string;
      narration?: string | null;
      caption?: string | null;
      duration: number;
      startTime: number;
    }>,
    wordTimings?: Map<string, Array<{ word: string; start: number; end: number }>>,
    style: SubtitleStyle = "CLEAN_WHITE",
  ) {
    await prisma.subtitle.deleteMany({ where: { projectId } });
    const entries: SubtitleEntry[] = [];

    for (const scene of scenes) {
      const text = scene.caption || scene.narration || "";
      if (!text) continue;

      const timings = wordTimings?.get(scene.id);
      if (timings && timings.length > 0) {
        entries.push({
          text,
          startTime: scene.startTime + timings[0].start,
          endTime: scene.startTime + timings[timings.length - 1].end,
          words: timings.map((w) => ({
            word: w.word,
            start: scene.startTime + w.start,
            end: scene.startTime + w.end,
          })),
        });
      } else {
        entries.push({
          text,
          startTime: scene.startTime,
          endTime: scene.startTime + scene.duration,
        });
      }
    }

    for (const entry of entries) {
      await prisma.subtitle.create({
        data: {
          projectId,
          text: entry.text,
          startTime: entry.startTime,
          endTime: entry.endTime,
          words: entry.words || undefined,
          style,
        },
      });
    }

    return entries;
  }

  generateSRT(entries: SubtitleEntry[]): string {
    return entries
      .map((e, i) => {
        const start = formatSrtTime(e.startTime);
        const end = formatSrtTime(e.endTime);
        return `${i + 1}\n${start} --> ${end}\n${e.text}\n`;
      })
      .join("\n");
  }

  generateWebVTT(entries: SubtitleEntry[]): string {
    const lines = ["WEBVTT", ""];
    for (const e of entries) {
      lines.push(`${formatVttTime(e.startTime)} --> ${formatVttTime(e.endTime)}`);
      lines.push(e.text);
      lines.push("");
    }
    return lines.join("\n");
  }
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, "0");
}
