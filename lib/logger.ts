type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  projectId?: string;
  jobId?: string;
  sceneId?: string;
  provider?: string;
  operation?: string;
  duration?: number;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

export function log(category: string, message: string, context?: LogContext, level: LogLevel = "info") {
  const entry = {
    timestamp: new Date().toISOString(),
    category,
    message,
    ...context,
  };
  const formatted = `[${category}] ${message} ${context ? JSON.stringify(context) : ""}`;
  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
  return entry;
}

export const videoLog = (message: string, context?: LogContext, level?: LogLevel) =>
  log("VIDEO_GENERATION", message, context, level);
