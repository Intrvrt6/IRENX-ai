const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "irenx-506618";

export type IrenxLogSeverity = "DEBUG" | "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";

export function cloudLog(severity: IrenxLogSeverity, message: string, fields: Record<string, unknown> = {}, request?: Request) {
  const traceHeader = request?.headers.get("X-Cloud-Trace-Context") || "";
  const traceId = traceHeader.split("/")[0];
  const entry: Record<string, unknown> = {
    severity,
    message,
    service: "irenx-api",
    project_id: PROJECT_ID,
    ...fields,
  };
  if (traceId) entry["logging.googleapis.com/trace"] = `projects/${PROJECT_ID}/traces/${traceId}`;
  console.log(JSON.stringify(entry));
}

export function cloudLoggingConfigured() {
  return Boolean(PROJECT_ID);
}
