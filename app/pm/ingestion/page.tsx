"use client";

import { useState, useEffect } from "react";
import { ProgressEvent, ActivityMatch, IngestionRecord, SpreadsheetRow } from "@/types/ingestion";
import { extractProgressEvents } from "@/lib/extraction";
import { matchProgressEvents } from "@/lib/matching";
import { parseSpreadsheetData, validateSpreadsheetHeaders } from "@/lib/spreadsheet";
import { tasks } from "@/data/tasks";
import { IngestionHistory } from "@/components/ingestion/IngestionHistory";
import { getPendingSupervisorReports, markSupervisorReportProcessed } from "@/lib/reports";
import * as XLSX from "xlsx";

const SAMPLE_REPORT = `Daily Progress Report — 04 Sep 2026

Civil:
Concrete pouring started at Grid A1-A4 at 08:30 AM.
Pile installation at Grid B1-B4 completed at 04:15 PM.

Electrical:
Cable tray installation started at Level 2, Zone A at 10:00 AM.

Finishing:
Wall plastering completed in Zone B.`;

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return "bg-status-ontrack-bg text-status-ontrack";
  if (confidence >= 50) return "bg-status-atrisk-bg text-status-atrisk";
  return "bg-status-delayed-bg text-status-delayed";
}

function getStatusClass(status: ActivityMatch["matchStatus"]): string {
  if (status === "MATCHED" || status === "EXACT") return "bg-status-ontrack-bg text-status-ontrack";
  return "bg-status-atrisk-bg text-status-atrisk";
}

function getIngestionStatusClass(status: IngestionRecord["status"]): string {
  if (status === "PROCESSED") return "bg-status-ontrack-bg text-status-ontrack";
  if (status === "PARTIAL") return "bg-status-atrisk-bg text-status-atrisk";
  return "bg-status-delayed-bg text-status-delayed";
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function determineIngestionStatus(matches: ActivityMatch[]): IngestionRecord["status"] {
  const matched = matches.filter((m) => m.matchStatus === "MATCHED" || m.matchStatus === "EXACT").length;
  const needsReview = matches.filter((m) => m.matchStatus === "REVIEW" || m.confidence < 80).length;
  if (needsReview > 0 && matched > 0) return "PARTIAL";
  if (needsReview > 0) return "PARTIAL";
  if (matched > 0) return "PROCESSED";
  return "FAILED";
}

export default function IngestionPage() {
  const [mode, setMode] = useState<"daily" | "spreadsheet" | "supervisor">("daily");
  const [reportText, setReportText] = useState<string>("");
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [matches, setMatches] = useState<ActivityMatch[]>([]);
  const [showSource, setShowSource] = useState(false);
  const [ingestionRecords, setIngestionRecords] = useState<IngestionRecord[]>([]);
  const [viewedRecord, setViewedRecord] = useState<IngestionRecord | null>(null);
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [spreadsheetRows, setSpreadsheetRows] = useState<SpreadsheetRow[]>([]);
  const [spreadsheetHeaders, setSpreadsheetHeaders] = useState<string[]>([]);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const [showSpreadsheetPreview, setShowSpreadsheetPreview] = useState(false);
  const [supervisorReports, setSupervisorReports] = useState<{ id: string; submittedAt: string; submittedBy: string; reportText: string }[]>([]);
  const [selectedSupervisorReport, setSelectedSupervisorReport] = useState<{ id: string; submittedAt: string; submittedBy: string; reportText: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ingestion_records");
      if (stored) {
        setIngestionRecords(JSON.parse(stored) as IngestionRecord[]);
      }
    }
  }, []);

  useEffect(() => {
    if (mode === "supervisor" && typeof window !== "undefined") {
      const reports = getPendingSupervisorReports();
      setSupervisorReports(reports.map(r => ({
        id: r.id,
        submittedAt: r.submittedAt,
        submittedBy: r.submittedBy,
        reportText: r.reportText,
      })));
    }
  }, [mode]);

  const handleLoadSample = () => {
    setReportText(SAMPLE_REPORT);
    setEvents([]);
    setMatches([]);
    setViewedRecord(null);
  };

  const handleProcess = () => {
    if (!reportText.trim()) return;
    const extracted = extractProgressEvents(reportText);
    setEvents(extracted);
    const matched = matchProgressEvents(extracted, tasks);
    setMatches(matched);
    setViewedRecord(null);

    const matchedCount = matched.filter((m) => m.matchStatus === "MATCHED" || m.matchStatus === "EXACT").length;
    const needsReviewCount = matched.filter((m) => m.matchStatus === "REVIEW" || m.confidence < 80).length;

    const record: IngestionRecord = {
      id: generateId(),
      sourceType: "DAILY_REPORT",
      sourceName: "Daily Progress Report",
      submittedAt: new Date().toISOString(),
      submittedBy: "Project Manager",
      rawText: reportText,
      eventsExtracted: extracted.length,
      eventsMatched: matchedCount,
      eventsNeedingReview: needsReviewCount,
      status: determineIngestionStatus(matched),
    };

    const updatedRecords = [record, ...ingestionRecords];
    setIngestionRecords(updatedRecords);
    if (typeof window !== "undefined") {
      localStorage.setItem("ingestion_events", JSON.stringify(extracted));
      localStorage.setItem("ingestion_matches", JSON.stringify(matched));
      localStorage.setItem("ingestion_records", JSON.stringify(updatedRecords));
    }
    setShowSource(true);
  };

  const handleProcessSupervisorReport = (report: { id: string; submittedAt: string; submittedBy: string; reportText: string }) => {
    if (!report.reportText.trim()) return;
    const extracted = extractProgressEvents(report.reportText);
    setEvents(extracted);
    const matched = matchProgressEvents(extracted, tasks);
    setMatches(matched);
    setViewedRecord(null);
    setSelectedSupervisorReport(report);

    const matchedCount = matched.filter((m) => m.matchStatus === "MATCHED" || m.matchStatus === "EXACT").length;
    const needsReviewCount = matched.filter((m) => m.matchStatus === "REVIEW" || m.confidence < 80).length;

    const record: IngestionRecord = {
      id: generateId(),
      sourceType: "DAILY_REPORT",
      sourceName: `Supervisor Report - ${report.submittedBy}`,
      submittedAt: new Date().toISOString(),
      submittedBy: "Project Manager",
      rawText: report.reportText,
      eventsExtracted: extracted.length,
      eventsMatched: matchedCount,
      eventsNeedingReview: needsReviewCount,
      status: determineIngestionStatus(matched),
    };

    const updatedRecords = [record, ...ingestionRecords];
    setIngestionRecords(updatedRecords);
    if (typeof window !== "undefined") {
      localStorage.setItem("ingestion_events", JSON.stringify(extracted));
      localStorage.setItem("ingestion_matches", JSON.stringify(matched));
      localStorage.setItem("ingestion_records", JSON.stringify(updatedRecords));
      markSupervisorReportProcessed(report.id);
      const updatedReports = getPendingSupervisorReports();
      setSupervisorReports(updatedReports.map(r => ({
        id: r.id,
        submittedAt: r.submittedAt,
        submittedBy: r.submittedBy,
        reportText: r.reportText,
      })));
    }
    setShowSource(true);
  };

  const handleSpreadsheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|csv)$/i)) {
      setSpreadsheetError("Unsupported file type. Please upload .xlsx or .csv files.");
      setSpreadsheetFile(null);
      return;
    }
    
    setSpreadsheetError(null);
    setSpreadsheetFile(file);
    setShowSpreadsheetPreview(false);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        let workbook: XLSX.WorkBook;
        
        if (file.name.endsWith(".csv")) {
          workbook = XLSX.read(data, { type: "binary" });
        } else {
          workbook = XLSX.read(data, { type: "array" });
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as unknown[][];
        
        if (jsonData.length === 0) {
          setSpreadsheetError("Spreadsheet is empty.");
          return;
        }
        
        const headers = (jsonData[0] as unknown[]).map(h => String(h ?? "")) as string[];
        const rows = jsonData.slice(1);
        
        const validation = validateSpreadsheetHeaders(headers);
        if (!validation.valid) {
          setSpreadsheetError(`Missing required columns: ${validation.missing.join(", ")}`);
          return;
        }
        
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
        const dateIdx = normalizedHeaders.indexOf("date");
        const disciplineIdx = normalizedHeaders.indexOf("discipline");
        const activityIdx = normalizedHeaders.indexOf("activity");
        const eventIdx = normalizedHeaders.indexOf("event");
        const timeIdx = normalizedHeaders.indexOf("time");
        const quantityIdx = normalizedHeaders.indexOf("quantity");
        const unitIdx = normalizedHeaders.indexOf("unit");
        const remarksIdx = normalizedHeaders.indexOf("remarks");
        
        const parsedRows: SpreadsheetRow[] = rows
          .filter((row: unknown[]) => row.some(cell => cell !== "" && cell !== null && cell !== undefined))
          .map((row: unknown[]) => ({
            date: String(row[dateIdx] ?? "").trim(),
            discipline: String(row[disciplineIdx] ?? "").trim(),
            activity: String(row[activityIdx] ?? "").trim(),
            event: String(row[eventIdx] ?? "").trim(),
            time: timeIdx >= 0 ? String(row[timeIdx] ?? "").trim() : undefined,
            quantity: quantityIdx >= 0 && row[quantityIdx] !== "" ? Number(row[quantityIdx]) : undefined,
            unit: unitIdx >= 0 ? String(row[unitIdx] ?? "").trim() : undefined,
            remarks: remarksIdx >= 0 ? String(row[remarksIdx] ?? "").trim() : undefined,
          }))
          .filter(row => row.date && row.discipline && row.activity && row.event);
        
        setSpreadsheetHeaders(headers);
        setSpreadsheetRows(parsedRows);
        setShowSpreadsheetPreview(true);
      } catch (err) {
        setSpreadsheetError("Failed to parse spreadsheet. Please check the file format.");
        console.error(err);
      }
    };
    
    if (file.name.endsWith(".csv")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleLoadSampleSpreadsheet = () => {
    const sampleData: SpreadsheetRow[] = [
      { date: "04 Sep 2026", discipline: "Civil", activity: "Concrete pouring at Grid A1-A4", event: "START", time: "08:30", quantity: 120, unit: "cu.m", remarks: "Started as planned" },
      { date: "04 Sep 2026", discipline: "Civil", activity: "Pile installation at Grid B1-B4", event: "END", time: "16:15", quantity: 8, unit: "piles", remarks: "Completed" },
      { date: "04 Sep 2026", discipline: "Electrical", activity: "Cable tray installation at Level 2 Zone A", event: "START", time: "10:00", quantity: 45, unit: "m", remarks: "Work started" },
      { date: "04 Sep 2026", discipline: "Finishing", activity: "Wall plastering in Zone B", event: "END", time: "17:00", quantity: 180, unit: "sq.m", remarks: "Completed" },
    ];
    setSpreadsheetRows(sampleData);
    setSpreadsheetHeaders(["Date", "Discipline", "Activity", "Event", "Time", "Quantity", "Unit", "Remarks"]);
    setSpreadsheetFile(new File(["sample"], "sample-spreadsheet.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    setShowSpreadsheetPreview(true);
    setSpreadsheetError(null);
  };

  const handleProcessSpreadsheet = () => {
    if (spreadsheetRows.length === 0) return;
    
    setSpreadsheetError(null);
    const extracted = parseSpreadsheetData(spreadsheetRows);
    setEvents(extracted);
    const matched = matchProgressEvents(extracted, tasks);
    setMatches(matched);
    setViewedRecord(null);
    setShowSpreadsheetPreview(false);
    
    const matchedCount = matched.filter((m) => m.matchStatus === "MATCHED" || m.matchStatus === "EXACT").length;
    const needsReviewCount = matched.filter((m) => m.matchStatus === "REVIEW" || m.confidence < 80).length;
    
    const record: IngestionRecord = {
      id: generateId(),
      sourceType: "SPREADSHEET",
      sourceName: spreadsheetFile?.name ?? "Spreadsheet",
      submittedAt: new Date().toISOString(),
      submittedBy: "Project Manager",
      rawText: `Spreadsheet: ${spreadsheetFile?.name ?? "Sample"}\nRows: ${spreadsheetRows.length}\nHeaders: ${spreadsheetHeaders.join(", ")}`,
      eventsExtracted: extracted.length,
      eventsMatched: matchedCount,
      eventsNeedingReview: needsReviewCount,
      status: determineIngestionStatus(matched),
    };
    
    const updatedRecords = [record, ...ingestionRecords];
    setIngestionRecords(updatedRecords);
    if (typeof window !== "undefined") {
      localStorage.setItem("ingestion_events", JSON.stringify(extracted));
      localStorage.setItem("ingestion_matches", JSON.stringify(matched));
      localStorage.setItem("ingestion_records", JSON.stringify(updatedRecords));
    }
    setShowSource(true);
  };

  const handleViewRecord = (record: IngestionRecord) => {
    setViewedRecord(record);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Data Ingestion</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg">
          Capture field updates and convert them into structured project activity events.
        </p>
      </div>

      <div className="card p-6 lg:p-8 space-y-6">
        <div className="flex gap-4 border-b border-border pb-4">
          <button
            onClick={() => { setMode("daily"); setEvents([]); setMatches([]); setViewedRecord(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-ring ${
              mode === "daily"
                ? "bg-primary text-white"
                : "text-text-secondary bg-hover hover:bg-border"
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => { setMode("spreadsheet"); setEvents([]); setMatches([]); setViewedRecord(null); setShowSpreadsheetPreview(false); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-ring ${
              mode === "spreadsheet"
                ? "bg-primary text-white"
                : "text-text-secondary bg-hover hover:bg-border"
            }`}
          >
            Spreadsheet
          </button>
          <button
            onClick={() => { setMode("supervisor"); setEvents([]); setMatches([]); setViewedRecord(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-ring ${
              mode === "supervisor"
                ? "bg-primary text-white"
                : "text-text-secondary bg-hover hover:bg-border"
            }`}
          >
            Supervisor Reports
          </button>
        </div>

        {mode === "daily" && (
          <>
            <div>
              <label htmlFor="report" className="block text-sm font-medium text-text-primary mb-3">
                Daily Progress Report
              </label>
              <textarea
                id="report"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                className="w-full min-h-[200px] p-4 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y font-mono text-sm leading-relaxed"
                placeholder="Paste or type the daily progress report here..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2.5 text-sm font-medium text-text-primary bg-hover border border-border rounded-lg hover:bg-border transition-colors focus-ring"
              >
                Load Sample Report
              </button>
              <button
                onClick={handleProcess}
                disabled={!reportText.trim()}
                className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process Report
              </button>
            </div>
          </>
        )}

        {mode === "spreadsheet" && (
          <>
            {spreadsheetError && (
              <div className="p-4 bg-status-delayed-bg/10 border border-status-delayed/30 rounded-lg text-status-delayed text-sm">
                {spreadsheetError}
              </div>
            )}

            {!showSpreadsheetPreview ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Upload Spreadsheet (.xlsx or .csv)
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleSpreadsheetFileChange}
                      className="sr-only"
                      id="spreadsheet-upload"
                    />
                    <label htmlFor="spreadsheet-upload" className="cursor-pointer">
                      <svg className="mx-auto h-10 w-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-text-secondary">Click to upload or drag and drop</p>
                      <p className="text-xs text-text-muted mt-1">Supports .xlsx and .csv files</p>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleLoadSampleSpreadsheet}
                    className="px-4 py-2.5 text-sm font-medium text-text-primary bg-hover border border-border rounded-lg hover:bg-border transition-colors focus-ring"
                  >
                    Load Sample Spreadsheet
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{spreadsheetFile?.name ?? "Sample Spreadsheet"}</p>
                    <p className="text-sm text-text-secondary">{spreadsheetRows.length} rows × {spreadsheetHeaders.length} columns</p>
                  </div>
                  <button
                    onClick={() => { setShowSpreadsheetPreview(false); setSpreadsheetFile(null); setSpreadsheetRows([]); setSpreadsheetError(null); }}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-hover rounded-lg transition-colors focus-ring"
                  >
                    Change File
                  </button>
                </div>

                <div className="overflow-x-auto max-h-64 border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-bg sticky top-0">
                      <tr className="border-b border-border">
                        {spreadsheetHeaders.map((header, idx) => (
                          <th key={idx} className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider text-xs">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {spreadsheetRows.slice(0, 10).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-hover/50">
                          <td className="px-3 py-2 text-text-primary font-mono text-xs">{row.date}</td>
                          <td className="px-3 py-2 text-text-secondary">{row.discipline}</td>
                          <td className="px-3 py-2 text-text-primary max-w-xs truncate">{row.activity}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              row.event === "START"
                                ? "bg-active-bg text-primary"
                                : "bg-status-ontrack-bg text-status-ontrack"
                            }`}>
                              {row.event}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-text-secondary font-mono text-xs">{row.time ?? "—"}</td>
                          <td className="px-3 py-2 text-text-secondary text-xs">{row.quantity ?? "—"}</td>
                          <td className="px-3 py-2 text-text-secondary text-xs">{row.unit ?? "—"}</td>
                          <td className="px-3 py-2 text-text-muted text-xs max-w-xs truncate">{row.remarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {spreadsheetRows.length > 10 && (
                  <p className="text-sm text-text-muted">Showing first 10 rows of {spreadsheetRows.length}</p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleProcessSpreadsheet}
                    disabled={spreadsheetRows.length === 0}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Process Spreadsheet
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === "supervisor" && (
          <div className="space-y-4">
            {supervisorReports.length === 0 ? (
              <div className="card p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-text-secondary">No pending supervisor reports.</p>
                <p className="mt-2 text-sm text-text-muted">Reports submitted from the Supervisor Portal will appear here.</p>
              </div>
            ) : (
              <>
                <div className="card p-4">
                  <h3 className="font-semibold text-text-primary mb-3">Pending Supervisor Reports ({supervisorReports.length})</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {supervisorReports.map((report) => (
                      <div key={report.id} className="border border-border rounded-lg p-4 hover:bg-hover/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                SUPERVISOR
                              </span>
                              <span className="text-sm text-text-secondary font-mono">
                                {new Date(report.submittedAt).toLocaleString("en-GB", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-text-secondary truncate">{report.reportText.slice(0, 150)}{report.reportText.length > 150 ? "..." : ""}</p>
                            <p className="mt-1 text-xs text-text-muted">Submitted by: {report.submittedBy}</p>
                          </div>
                          <button
                            onClick={() => handleProcessSupervisorReport(report)}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring whitespace-nowrap"
                          >
                            Import & Process
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="space-y-6">
          <div className="card p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Events Extracted: {events.length}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium text-text-secondary">Activity</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Discipline</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Event</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Time</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Source</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-border/50">
                      <td className="py-3 text-text-primary font-mono">{event.activityDescription}</td>
                      <td className="py-3 text-text-secondary">{event.discipline}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            event.eventType === "START"
                              ? "bg-active-bg text-primary"
                              : "bg-status-ontrack-bg text-status-ontrack"
                          }`}
                        >
                          {event.eventType}
                        </span>
                      </td>
                      <td className="py-3 text-text-secondary font-mono">{event.eventTime ?? "—"}</td>
                      <td className="py-3 text-text-secondary">
                        {event.sourceType === "SPREADSHEET" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                            Spreadsheet
                          </span>
                        ) : (
                          "Daily Report"
                        )}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-atrisk-bg text-status-atrisk">
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Activity Matching: {matches.length} event(s)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium text-text-secondary">Source Event</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Discipline</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Event</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Matched Activity</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Confidence</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => {
                    const event = events.find((e) => e.id === match.eventId);
                    return (
                      <tr key={match.eventId} className="border-b border-border/50">
                        <td className="py-3 text-text-primary font-mono max-w-xs truncate">{event?.activityDescription ?? "—"}</td>
                        <td className="py-3 text-text-secondary">{event?.discipline ?? "—"}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              event?.eventType === "START"
                                ? "bg-active-bg text-primary"
                                : "bg-status-ontrack-bg text-status-ontrack"
                            }`}
                          >
                            {event?.eventType ?? "—"}
                          </span>
                        </td>
                        <td className="py-3">
                          {match.matchedActivityId ? (
                            <div>
                              <div className="font-medium text-text-primary">{match.matchedActivityName}</div>
                              <div className="text-xs text-text-muted font-mono">{match.matchedActivityCode}</div>
                            </div>
                          ) : (
                            <span className="text-text-muted">No confident match</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceClass(match.confidence)}`}>
                            {match.confidence}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(match.matchStatus)}`}>
                            {match.matchStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Original Report (Audit Trail)</h2>
              <button
                onClick={() => setShowSource(!showSource)}
                className="text-sm text-text-secondary hover:text-text-primary font-medium"
              >
                {showSource ? "Hide" : "Show"} Source
              </button>
            </div>
            {showSource && (
              <pre className="bg-bg border border-border rounded-lg p-4 text-sm text-text-secondary font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                {mode === "spreadsheet" ? (reportText || `Spreadsheet: ${spreadsheetFile?.name ?? "Sample"}\nRows: ${spreadsheetRows.length}\nHeaders: ${spreadsheetHeaders.join(", ")}`) : reportText}
              </pre>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Ingestion History</h2>
          {viewedRecord && (
            <button
              onClick={() => setViewedRecord(null)}
              className="text-sm text-text-secondary hover:text-text-primary font-medium"
            >
              Close Details
            </button>
          )}
        </div>

        {viewedRecord ? (
          <div className="card p-6 lg:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Ingestion Details</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 bg-bg border border-border rounded-lg">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Source</p>
                <p className="mt-1 text-text-primary font-medium">{viewedRecord.sourceName}</p>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Submitted At</p>
                <p className="mt-1 text-text-secondary font-mono text-sm">
                  {new Date(viewedRecord.submittedAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Events Extracted</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{viewedRecord.eventsExtracted}</p>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Matched</p>
                <p className="mt-1 text-2xl font-semibold text-status-ontrack">{viewedRecord.eventsMatched}</p>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Needs Review</p>
                <p className="mt-1 text-2xl font-semibold text-status-atrisk">{viewedRecord.eventsNeedingReview}</p>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Status</p>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getIngestionStatusClass(viewedRecord.status)}`}>
                    {viewedRecord.status}
                  </span>
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Original Report</p>
              <pre className="bg-bg border border-border rounded-lg p-4 text-sm text-text-secondary font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                {viewedRecord.rawText}
              </pre>
            </div>
          </div>
        ) : (
          <IngestionHistory records={ingestionRecords} onViewRecord={handleViewRecord} />
        )}
      </div>
    </div>
  );
}