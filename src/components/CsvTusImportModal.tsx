import React, { useState } from 'react';
import {
  ThermocoupleChannel,
  SurveySetpoint,
  FurnaceClass,
  TempUnit,
  SurveyMetadata,
  TusTrendData,
  DetectedDwellPeriod,
} from '../types/tus';
import {
  parseTusCsv,
  detectTusDwells,
  generateSampleTusCsv,
  CsvParseResult,
  DetectedDwell,
  CsvColumnMapping,
  ParsedCsvRow,
  convertToTrendData,
  convertToDwellPeriods,
} from '../utils/csvTusParser';
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Sliders,
  X,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';

interface CsvTusImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ThermocoupleChannel[];
  setpoints: SurveySetpoint[];
  furnaceClass: FurnaceClass;
  tempUnit: TempUnit;
  meta: SurveyMetadata;
  onApplyImport: (
    updatedSetpoints: SurveySetpoint[],
    intervalSeconds?: number,
    trendData?: TusTrendData[],
    dwellPeriods?: DetectedDwellPeriod[],
    rawRows?: ParsedCsvRow[],
    mappings?: CsvColumnMapping[]
  ) => void;
}

export const CsvTusImportModal: React.FC<CsvTusImportModalProps> = ({
  isOpen,
  onClose,
  channels,
  setpoints,
  furnaceClass,
  tempUnit,
  meta,
  onApplyImport,
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [mappings, setMappings] = useState<CsvColumnMapping[]>([]);
  const [targetTempsInput, setTargetTempsInput] = useState<string>(
    setpoints.map((s) => s.targetTemp).join(', ') || '42, 110, 275'
  );
  const [minDwellMin, setMinDwellMin] = useState<number>(30);
  const [updateInterval, setUpdateInterval] = useState<boolean>(true);
  const [detectedDwells, setDetectedDwells] = useState<DetectedDwell[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle file select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processCsvText(text, file.name);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const processCsvText = (text: string, name: string) => {
    setCsvContent(text);
    setFileName(name);
    setErrorMsg(null);
    setDetectedDwells(null);

    try {
      const res = parseTusCsv(text, channels);
      setParseResult(res);
      setMappings(res.mappings);

      // If text contains the 42, 110, 275 example or similar, suggest target temps
      const targetTemps = targetTempsInput
        .split(',')
        .map((t) => parseFloat(t.trim()))
        .filter((t) => !isNaN(t) && t > 0);

      // Auto-run dwell search
      const dwells = detectTusDwells(
        res.rows,
        targetTemps,
        res.mappings,
        furnaceClass,
        tempUnit,
        minDwellMin
      );
      setDetectedDwells(dwells);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing CSV file.');
      setParseResult(null);
    }
  };



  // Update a column's mapped channel
  const handleMappingChange = (csvHeader: string, newChannelId: string) => {
    const updated = mappings.map((m) => {
      if (m.csvHeader !== csvHeader) return m;
      const targetCh = channels.find((c) => c.id === newChannelId);
      return {
        ...m,
        channelId: newChannelId,
        channelNumber: targetCh ? targetCh.channelNumber : 0,
      };
    });
    setMappings(updated);

    // Re-run dwell search with updated mappings
    if (parseResult) {
      const targetTemps = targetTempsInput
        .split(',')
        .map((t) => parseFloat(t.trim()))
        .filter((t) => !isNaN(t) && t > 0);
      const dwells = detectTusDwells(
        parseResult.rows,
        targetTemps,
        updated,
        furnaceClass,
        tempUnit,
        minDwellMin
      );
      setDetectedDwells(dwells);
    }
  };

  // Re-search dwells when user changes target temperatures
  const handleRunDwellSearch = () => {
    if (!parseResult) return;
    const targetTemps = targetTempsInput
      .split(',')
      .map((t) => parseFloat(t.trim()))
      .filter((t) => !isNaN(t) && t > 0);

    const dwells = detectTusDwells(
      parseResult.rows,
      targetTemps,
      mappings,
      furnaceClass,
      tempUnit,
      minDwellMin
    );
    setDetectedDwells(dwells);
  };

  // Apply detected dwells to Survey Setpoints
  const handleApply = () => {
    if (!detectedDwells || detectedDwells.length === 0) return;

    // Create or update setpoints based on detected dwells
    const newSetpoints: SurveySetpoint[] = detectedDwells.map((dwell, idx) => {
      const existingSp = setpoints.find((s) => Math.abs(s.targetTemp - dwell.targetTemp) < 5);
      return {
        id: existingSp ? existingSp.id : `sp-csv-${Date.now()}-${idx}`,
        targetTemp: dwell.targetTemp,
        soakDurationMinutes: dwell.evalDurationMinutes,
        soakStartTime: dwell.evalStartTimeStr,
        soakEndTime: dwell.evalEndTimeStr,
        fullHoldStartTime: dwell.fullStartTimeStr,
        fullHoldEndTime: dwell.fullEndTimeStr,
        fullHoldDurationMinutes: dwell.fullDurationMinutes,
        maxOvershootObserved: dwell.maxOvershoot,
        readings: dwell.channelReadings,
      };
    });

    const newInterval =
      updateInterval && parseResult ? parseResult.detectedIntervalSeconds : undefined;

    // Prepare trend data for the report graph
    let trendData: TusTrendData[] | undefined;
    let dwellPeriods: DetectedDwellPeriod[] | undefined;
    
    if (parseResult && detectedDwells) {
      trendData = convertToTrendData(parseResult.rows, mappings);
      dwellPeriods = convertToDwellPeriods(detectedDwells, parseResult.rows);
    }

    onApplyImport(
      newSetpoints,
      newInterval,
      trendData,
      dwellPeriods,
      parseResult ? parseResult.rows : undefined,
      mappings
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-950/80 border border-blue-800/60 rounded-xl text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  Import TUS Datalogger CSV & Automated Dwell Search
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold uppercase">
                  AMS 2750 Rev H / Nadcap
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Parses multi-temperature runs (e.g. 42°C, 110°C, 275°C), recognizes logging intervals, and auto-detects stabilized soak dwells.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* 1. File Upload / Sample Loader */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="md:col-span-3 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 bg-slate-950/60 cursor-pointer transition-colors group">
              <input
                type="file"
                accept=".csv,.txt,.tsv,.dat"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-cyan-400 mb-2 transition-colors" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                {fileName ? fileName : 'Click to select TUS CSV / Datapaq / Yokogawa log file'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Supports .csv, .tsv, comma, or semicolon-separated exports
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 2. Detected Log Interval & Dwell Search Parameters */}
          {parseResult && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                {/* Interval Recognition */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">
                        Detected Logging Interval: {parseResult.detectedIntervalSeconds} seconds
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          parseResult.detectedIntervalSeconds <= 120
                            ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                            : 'bg-red-950 border border-red-800 text-red-300'
                        }`}
                      >
                        {parseResult.detectedIntervalSeconds <= 120
                          ? 'AMS 2750 Compliant (≤ 120s)'
                          : 'Exceeds AMS 2750 Limit (Max 120s)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Total records: {parseResult.rows.length} rows spanning {parseResult.totalDurationMinutes} minutes.
                    </div>
                  </div>
                </div>

                {/* Auto Update Metadata Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200">
                  <input
                    type="checkbox"
                    checked={updateInterval}
                    onChange={(e) => setUpdateInterval(e.target.checked)}
                    className="rounded border-slate-600 text-cyan-500 focus:ring-0"
                  />
                  <span>Sync survey metadata interval ({parseResult.detectedIntervalSeconds}s)</span>
                </label>
              </div>

              {/* Setpoints to Detect */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Target Setpoints to Search in CSV ({tempUnit}):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={targetTempsInput}
                      onChange={(e) => setTargetTempsInput(e.target.value)}
                      placeholder="e.g. 42, 110, 275"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={handleRunDwellSearch}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Search Dwells</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Comma-separated temperatures surveyed in this multi-point run.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Min Required Soak Duration:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="10"
                      max="240"
                      value={minDwellMin}
                      onChange={(e) => setMinDwellMin(parseInt(e.target.value, 10) || 30)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="text-slate-400 font-mono">min</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    AMS 2750 Rev H § 3.5.15 requires ≥ 30 min.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Column Mapping Section */}
          {parseResult && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200">
                    Thermocouple Column Mapping ({mappings.length} CSV Columns)
                  </span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  Confirm or reassign columns to match TC channels in this app
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 pr-1">
                <table className="w-full text-left">
                  <thead className="text-[10px] uppercase text-slate-500 font-mono">
                    <tr>
                      <th className="py-1 px-2">CSV Column Header</th>
                      <th className="py-1 px-2">Sample Value</th>
                      <th className="py-1 px-2">Assigned App TC Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {mappings.map((m) => {
                      const sampleVal = parseResult.rows[0]?.values[m.csvHeader];
                      return (
                        <tr key={m.csvHeader} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-2 font-mono text-cyan-300 font-medium">
                            {m.csvHeader}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-slate-400">
                            {sampleVal !== undefined ? `${sampleVal} ${tempUnit}` : 'N/A'}
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={m.channelId}
                              onChange={(e) => handleMappingChange(m.csvHeader, e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none w-full max-w-xs"
                            >
                              <option value="">-- Do Not Import --</option>
                              {channels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  TC {ch.channelNumber}: {ch.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Detected Dwells Results */}
          {detectedDwells && detectedDwells.length > 0 && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  {detectedDwells.every((d) => d.isSpreadCompliant) ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="font-bold text-slate-200">
                    Detected Stabilized Dwell Periods ({detectedDwells.length} Setpoints Found)
                  </span>
                </div>
                {detectedDwells.every((d) => d.isSpreadCompliant) ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">
                    All Dwells Meet Class {furnaceClass} Steady-State Criteria
                  </span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px] font-bold">
                    Post-Stabilization 30-Min Capture Window (Includes Out-of-Tolerance Dwells)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {detectedDwells.map((dwell, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-900/90 border rounded-xl p-3.5 space-y-2 transition-all ${
                      dwell.isSpreadCompliant
                        ? 'border-slate-800 hover:border-cyan-500/60'
                        : 'border-amber-800/70 hover:border-amber-500/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dwell.isSpreadCompliant ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        {dwell.targetTemp} {tempUnit}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            dwell.isSpreadCompliant
                              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                              : 'bg-red-950 border border-red-800 text-red-300'
                          }`}
                        >
                          {dwell.isSpreadCompliant ? 'IN TOL' : 'OUT OF TOL'}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            dwell.isDurationCompliant
                              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                              : 'bg-amber-950 border border-amber-800 text-amber-300'
                          }`}
                        >
                          {dwell.durationMinutes} min
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 font-mono text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Full Soak Hold:</span>
                        <strong className="text-slate-200">
                          {dwell.fullStartTimeStr} ➔ {dwell.fullEndTimeStr}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capture Window (30m):</span>
                        <strong className="text-cyan-300">
                          {dwell.startTimeStr} ➔ {dwell.endTimeStr}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Overshoot:</span>
                        <strong className="text-amber-400">{dwell.maxOvershoot} {tempUnit}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Window Spread:</span>
                        <strong className={dwell.isSpreadCompliant ? 'text-emerald-400' : 'text-red-400'}>
                          {dwell.tempSpread} {tempUnit}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 text-[10px]">
                        <span className="text-slate-500">Channels Read:</span>
                        <span className="text-slate-300">
                          {Object.keys(dwell.channelReadings).length} of {channels.length}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={!detectedDwells || detectedDwells.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
              detectedDwells && detectedDwells.length > 0
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Apply Detected Dwells to Survey Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
