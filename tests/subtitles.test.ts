import { describe, it, expect } from "vitest";

describe("Subtitle Formatting", () => {
  function generateSRT(entries: Array<{ text: string; startTime: number; endTime: number }>): string {
    return entries
      .map((e, i) => {
        const start = formatSrtTime(e.startTime);
        const end = formatSrtTime(e.endTime);
        return `${i + 1}\n${start} --> ${end}\n${e.text}\n`;
      })
      .join("\n");
  }

  function generateWebVTT(entries: Array<{ text: string; startTime: number; endTime: number }>): string {
    const lines = ["WEBVTT", ""];
    for (const e of entries) {
      lines.push(`${formatVttTime(e.startTime)} --> ${formatVttTime(e.endTime)}`);
      lines.push(e.text);
      lines.push("");
    }
    return lines.join("\n");
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

  it("generates SRT format", () => {
    const entries = [
      { text: "Hello world", startTime: 0, endTime: 2 },
      { text: "Second line", startTime: 2.5, endTime: 5 },
    ];

    const srt = generateSRT(entries);
    expect(srt).toContain("1\n");
    expect(srt).toContain("Hello world");
    expect(srt).toContain("00:00:00,000 --> 00:00:02,000");
    expect(srt).toContain("Second line");
  });

  it("generates WebVTT format", () => {
    const entries = [{ text: "Test caption", startTime: 1, endTime: 3 }];
    const vtt = generateWebVTT(entries);
    expect(vtt).toContain("WEBVTT");
    expect(vtt).toContain("Test caption");
  });
});
