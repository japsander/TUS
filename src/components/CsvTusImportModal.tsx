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
import { CLASS_TOLERANCES } from '../utils/ams2750';
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Sliders,
  Check,
  FileSpreadsheet,
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
    setpoints: SurveySetpoint[],
    trendData: TusTrendData[],
    dwellPeriods: DetectedDwellPeriod[],
    rawRows: ParsedCsvRow[],
    mappings: CsvColumnMapping[],
    intervalSeconds?: number
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
    setpoints.map((s) => s.targetTemp).join(', ') || '42, 110, 180'
  );
  const [minDwellMin, setMinDwellMin] = useState<number>(30);
  const [updateInterval, setUpdateInterval] = useState<boolean>(true);
  const [detectedDwells, setDetectedDwells] = useState<DetectedDwell[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunDwellSearchForClass = React.useCallback(
    (targetClass: FurnaceClass) => {
      if (!parseResult) return;
      const targetTemps = targetTempsInput
        .split(',')
        .map((t) => parseFloat(t.trim()))
        .filter((t) => !isNaN(t) && t > 0);

      const dwells = detectTusDwells(
        parseResult.rows,
        targetTemps,
        mappings,
        targetClass,
        tempUnit,
        minDwellMin
      );
      setDetectedDwells(dwells);
    },
    [parseResult, targetTempsInput, mappings, tempUnit, minDwellMin]
  );

  const recommendedClassForDwells = React.useMemo(() => {
    if (!detectedDwells || !parseResult) return null;
    const targetTemps = targetTempsInput
      .split(',')
      .map((t) => parseFloat(t.trim()))
      .filter((t) => !isNaN(t) && t > 0);
    const classes: FurnaceClass[] = [1, 2, 3, 4, 5, 6];
    for (const fc of classes) {
      const testDwells = detectTusDwells(
        parseResult.rows,
        targetTemps,
        mappings,
        fc,
        tempUnit,
        minDwellMin
      );
      if (testDwells.length > 0 && testDwells.every((d) => d.isSpreadCompliant)) {
        return fc;
      }
    }
    return null;
  }, [detectedDwells, parseResult, targetTempsInput, mappings, tempUnit, minDwellMin]);

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

      // Auto-detect target temperatures or use default
      const targetTemps = targetTempsInput
        .split(',')
        .map((t) => parseFloat(t.trim()))
        .filter((t) => !isNaN(t) && t > 0);

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
      setErrorMsg(err.message || 'Failed to parse CSV file format.');
    }
  };

  const handleLoadSample = () => {
    const sampleText = generateSampleTusCsv(channels);
    processCsvText(sampleText, 'sample_tus_survey.csv');
  };

  const handleMappingChange = (channelId: string, csvHeader: string) => {
    const updated = mappings.map((m) => {
      if (m.channelId === channelId) {
        return { ...m, channelId: '' };
      }
      if (m.csvHeader === csvHeader) {
        return { ...m, channelId };
      }
      return m;
    });
    setMappings(updated);

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
    if (!detectedDwells || !parseResult) return;

    // Create or update setpoints based on detected dwells
    const newSetpoints: SurveySetpoint[] = detectedDwells.map((dwell, idx) => {
      const existingSp = setpoints.find((s) => Math.abs(s.targetTemp - dwell.targetTemp) < 5);
      return {
        id: existingSp ? existingSp.id : `sp-csv-${Date.now()}-${idx}`,
        targetTemp: dwell.targetTemp,
        soakDurationMinutes: dwell.evalDurationMinutes,
        soakStartTime: dwell.startTimeStr,
        soakEndTime: dwell.endTimeStr,
        maxOvershootObserved: dwell.maxOvershoot,
        readings: dwell.channelReadings,
      };
    });

    const trendData = convertToTrendData(parseResult.rows, mappings);
    const dwellPeriods = convertToDwellPeriods(detectedDwells, parseResult.rows);

    onApplyImport(
      newSetpoints,
      trendData,
      dwellPeriods,
      parseResult.rows,
      mappings,
      updateInterval ? parseResult.detectedIntervalSeconds : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            <div>
              <h3 className="text-base font-bold text-white">Import TUS CSV Data & Automap</h3>
              <p className="text-xs text-slate-400">
                Upload furnace datalogger CSV or Excel export for AMS 2750 Rev H soak & uniformity analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Upload / Sample Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 bg-slate-950/50 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-200">
                {fileName ? fileName : 'Click to Upload Datalogger CSV'}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports CSV exports from Eurotherm, Yokogawa, Watlow, Honeywell, etc.
              </span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="border border-slate-800 rounded-2xl p-6 bg-slate-950/50 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Try With Sample Datalogger File
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Don't have a CSV handy? Load our pre-configured 35-channel composite autoclave sample survey dataset containing stable ramps and soaks at 42 °C, 110 °C, and 180 °C.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="mt-4 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Load Sample TUS Survey Dataset</span>
              </button>
            </div>
          </div>

          {/* 2. Survey Parameters Configuration */}
          {parseResult && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                Survey Search Parameters & Dwell Detection
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Target Setpoints ({tempUnit}, comma separated)
                  </label>
                  <input
                    type="text"
                    value={targetTempsInput}
                    onChange={(e) => setTargetTempsInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Min Dwell Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={minDwellMin}
                    onChange={(e) => setMinDwellMin(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleRunDwellSearch}
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Re-Run Dwell Detection</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  type="checkbox"
                  id="updateInterval"
                  checked={updateInterval}
                  onChange={(e) => setUpdateInterval(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="updateInterval" className="text-xs text-slate-300 cursor-pointer">
                  Automatically set survey logging interval to detected CSV frequency ({parseResult.detectedIntervalSeconds}s)
                </label>
              </div>
            </div>
          )}

          {/* 3. Channel Mapping Table */}
          {mappings.length > 0 && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Channel Automap ({mappings.filter((m) => m.channelId !== '').length} of {channels.length} Mapped)
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  {parseResult?.rows.length} rows parsed
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                      <th className="p-2.5">CSV Column Header</th>
                      <th className="p-2.5">Sample Value</th>
                      <th className="p-2.5">Assigned TUS Thermocouple Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {mappings.map((m, idx) => {
                      const sampleVal = parseResult?.rows[0]?.values[m.csvHeader] ?? 'N/A';
                      return (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-slate-300">{m.csvHeader}</td>
                          <td className="p-2.5 text-cyan-400">{sampleVal}</td>
                          <td className="p-2.5">
                            <select
                              value={m.channelId}
                              onChange={(e) => handleMappingChange(e.target.value, m.csvHeader)}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              <option value="">-- Unmapped / Ignore --</option>
                              {channels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  TC {ch.channelNumber} ({ch.label})
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

              {recommendedClassForDwells !== null && recommendedClassForDwells !== furnaceClass && (
                <div className="p-3 rounded-xl bg-indigo-950/90 border border-indigo-700/80 text-indigo-200 text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-md">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      <strong>Auto-Classification Recommendation:</strong> Survey fails Class {furnaceClass}, but <strong>100% PASSES Class {recommendedClassForDwells} (±{CLASS_TOLERANCES[recommendedClassForDwells][tempUnit]}${tempUnit})</strong> across all setpoints.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunDwellSearchForClass(recommendedClassForDwells)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer transition-all shrink-0 shadow-sm"
                  >
                    Re-Evaluate for Class {recommendedClassForDwells}
                  </button>
                </div>
              )}

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
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Window Spread:</span>
                        <div className="text-right">
                          <strong className={dwell.tempSpread > (CLASS_TOLERANCES[furnaceClass]?.[tempUnit] ?? 6) * 2 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {dwell.tempSpread} {tempUnit}
                          </strong>
                          <span className="text-[9.5px] text-slate-500 block">
                            (Max Allowable: {(CLASS_TOLERANCES[furnaceClass]?.[tempUnit] ?? 6) * 2} {tempUnit})
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 text-[10px]">
                        <span className="text-slate-500">Channels Read:</span>
                        <span className="text-slate-300">
                          {Object.keys(dwell.channelReadings).length} of {channels.length}
                        </span>
                      </div>
                      {!dwell.isSpreadCompliant && (
                        <div className="text-[10px] text-red-400/90 font-sans italic pt-0.5 border-t border-red-900/40">
                          ⚠️ One or more sensors breached Class {furnaceClass} band [±{CLASS_TOLERANCES[furnaceClass]?.[tempUnit] ?? 6}{tempUnit}]
                        </div>
                      )}
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
