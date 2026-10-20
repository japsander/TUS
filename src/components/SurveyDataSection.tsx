import React, { useState } from 'react';
import {
  SurveySetpoint,
  ThermocoupleChannel,
  FurnaceClass,
  TempUnit,
  SurveyMetadata,
  TusTrendData,
  DetectedDwellPeriod,
  QualifiedWorkZone,
} from '../types/tus';
import { CLASS_TOLERANCES, evaluateSetpoint, calculateVolumeInM3, calculateVolumeInCuFt, getMinRequiredSensors } from '../utils/ams2750';
import {
  Thermometer,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Upload,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import { CsvTusImportModal } from './CsvTusImportModal';
import { ParsedCsvRow, CsvColumnMapping } from '../utils/csvTusParser';

interface SurveyDataSectionProps {
  setpoints: SurveySetpoint[];
  channels: ThermocoupleChannel[];
  furnaceClass: FurnaceClass;
  tempUnit: TempUnit;
  instrumentCorrection: number;
  meta: SurveyMetadata;
  qwz?: QualifiedWorkZone;
  activeSetpointId?: string;
  onSelectSetpoint?: (id: string) => void;
  onSelectChannel?: (id: string) => void;
  onUpdateSetpoints: (setpoints: SurveySetpoint[]) => void;
  onUpdateChannels: (channels: ThermocoupleChannel[]) => void;
  onUpdateMeta?: (meta: SurveyMetadata) => void;
  onUpdateTrendData?: (data: TusTrendData[]) => void;
  onUpdateDwellPeriods?: (periods: DetectedDwellPeriod[]) => void;
  onUpdateRawRows?: (rawRows: ParsedCsvRow[], mappings: CsvColumnMapping[]) => void;
  onOpenMethodology?: () => void;
}

export const SurveyDataSection: React.FC<SurveyDataSectionProps> = ({
  setpoints,
  channels,
  furnaceClass,
  tempUnit,
  instrumentCorrection,
  meta,
  qwz,
  activeSetpointId: propActiveSetpointId,
  onSelectSetpoint,
  onSelectChannel,
  onUpdateSetpoints,
  onUpdateChannels,
  onUpdateMeta,
  onUpdateTrendData,
  onUpdateDwellPeriods,
  onUpdateRawRows,
  onOpenMethodology,
}) => {
  const [internalActiveSetpointId, setInternalActiveSetpointId] = useState<string>(
    setpoints[0]?.id || ''
  );
  const activeSetpointId = propActiveSetpointId ?? internalActiveSetpointId;
  const setActiveSetpointId = (id: string) => {
    setInternalActiveSetpointId(id);
    if (onSelectSetpoint) onSelectSetpoint(id);
  };
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const tolerance = CLASS_TOLERANCES[furnaceClass][tempUnit];

  // Add new setpoint
  const handleAddSetpoint = () => {
    const nextIdx = setpoints.length + 1;
    const baseTemp = setpoints.length > 0 ? setpoints[setpoints.length - 1].targetTemp + 300 : 1000;
    const newSp: SurveySetpoint = {
      id: `sp-${Date.now()}`,
      targetTemp: baseTemp,
      soakDurationMinutes: 0,
      soakStartTime: '',
      soakEndTime: '',
      maxOvershootObserved: 0,
      readings: {},
    };

    // Initialize readings
    channels.forEach((ch) => {
      newSp.readings[ch.id] = baseTemp;
    });

    onUpdateSetpoints([...setpoints, newSp]);
    setActiveSetpointId(newSp.id);
  };

  // Delete setpoint
  const handleDeleteSetpoint = (id: string) => {
    if (setpoints.length <= 1) return;
    const updated = setpoints.filter((s) => s.id !== id);
    onUpdateSetpoints(updated);
    if (activeSetpointId === id) {
      setActiveSetpointId(updated[0]?.id || '');
    }
  };

  // Update setpoint field
  const handleUpdateSetpoint = (id: string, updates: Partial<SurveySetpoint>) => {
    const updated = setpoints.map((s) => (s.id === id ? { ...s, ...updates } : s));
    onUpdateSetpoints(updated);
  };

  // Update raw reading for a channel in active setpoint
  const handleReadingChange = (spId: string, chId: string, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = setpoints.map((s) => {
      if (s.id !== spId) return s;
      return {
        ...s,
        readings: {
          ...s.readings,
          [chId]: num,
        },
      };
    });
    onUpdateSetpoints(updated);
  };

  // Update TC correction factor for a channel
  const handleCorrectionChange = (chId: string, spId: string, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = channels.map((ch) => {
      if (ch.id !== chId) return ch;
      return {
        ...ch,
        correctionFactors: {
          ...ch.correctionFactors,
          [spId]: num,
        },
      };
    });
    onUpdateChannels(updated);
  };



  const minSensorsTable17 = qwz
    ? getMinRequiredSensors(calculateVolumeInCuFt(qwz, meta.dimUnit), calculateVolumeInM3(qwz, meta.dimUnit)).minSensors
    : 9;

  const currentSetpoint = setpoints.find((s) => s.id === activeSetpointId) || setpoints[0];
  const analysis = currentSetpoint
    ? evaluateSetpoint(
        currentSetpoint,
        channels,
        furnaceClass,
        tempUnit,
        instrumentCorrection,
        minSensorsTable17,
        qwz,
        meta.furnaceApplication || 'Parts'
      )
    : null;

  const handleApplyCsvImport = (
    importedSetpoints: SurveySetpoint[],
    intervalSeconds?: number,
    trendData?: TusTrendData[],
    dwellPeriods?: DetectedDwellPeriod[],
    rawRows?: ParsedCsvRow[],
    mappings?: CsvColumnMapping[]
  ) => {
    onUpdateSetpoints(importedSetpoints);
    if (importedSetpoints[0]) {
      setActiveSetpointId(importedSetpoints[0].id);
    }
    if (intervalSeconds !== undefined && onUpdateMeta) {
      onUpdateMeta({
        ...meta,
        dataIntervalSeconds: intervalSeconds,
      });
    }
    if (trendData && onUpdateTrendData) {
      onUpdateTrendData(trendData);
    }
    if (dwellPeriods && onUpdateDwellPeriods) {
      onUpdateDwellPeriods(dwellPeriods);
    }
    if (onUpdateRawRows && rawRows) {
      onUpdateRawRows(rawRows, mappings || []);
    }
    setImportNotice(
      `Successfully imported ${importedSetpoints.length} TUS dwell periods (${importedSetpoints.map(s => `${s.targetTemp}${tempUnit}`).join(', ')}) with ${intervalSeconds ? `${intervalSeconds}s logging interval` : 'mapped channels'}.`
    );
    setTimeout(() => setImportNotice(null), 8000);
  };

  return (
    <div className="space-y-6">
      {importNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-emerald-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Setpoint Navigation & Selector */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {setpoints.map((sp, idx) => {
            const spAnalysis = evaluateSetpoint(
              sp,
              channels,
              furnaceClass,
              tempUnit,
              instrumentCorrection,
              minSensorsTable17,
              qwz,
              meta.furnaceApplication || 'Parts'
            );
            const isActive = sp.id === activeSetpointId;
            const isFailed = !spAnalysis.passed;
            return (
              <button
                key={sp.id}
                onClick={() => setActiveSetpointId(sp.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  isActive
                    ? isFailed
                      ? 'bg-red-950/90 border-red-500 text-red-200 shadow-lg ring-2 ring-red-500/50'
                      : 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md ring-1 ring-cyan-500/30'
                    : isFailed
                    ? 'bg-slate-950 border-red-900/60 text-red-300/80 hover:text-red-100 hover:border-red-700'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Thermometer className={`w-3.5 h-3.5 ${isFailed ? 'text-red-400' : 'text-cyan-400'}`} />
                <span>
                  SP {idx + 1}: {sp.targetTemp} {tempUnit}
                </span>
                {spAnalysis.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    {isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-800 text-white animate-pulse">
                        Schematic Highlighted
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          <button
            onClick={handleAddSetpoint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Setpoint</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenMethodology && (
            <button
              onClick={onOpenMethodology}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Open Auditor Calculation & Pass/Fail Methodology Reference"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calculation &amp; Pass/Fail Info</span>
            </button>
          )}

          {/* Import TUS CSV Button */}
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Import TUS datalogger CSV, assign columns by TC number, and auto-detect compliant dwells"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import TUS CSV</span>
          </button>

          {currentSetpoint && setpoints.length > 1 && (
            <button
              onClick={() => handleDeleteSetpoint(currentSetpoint.id)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
              title="Delete this setpoint"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Setpoint Failure Notification Banner with Schematic Highlight Notice */}
      {currentSetpoint && analysis && !analysis.passed && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-700/90 text-red-100 text-xs shadow-xl animate-fadeIn space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="font-extrabold text-white text-xs sm:text-sm">
                SP {currentSetpoint.targetTemp} {tempUnit} DEEMED NON-CONFORMING (FAIL)
              </span>
              <span className="text-[11px] bg-red-900 border border-red-600/80 text-white font-mono px-2 py-0.5 rounded font-bold">
                {analysis.channelResults.filter((cr) => !cr.inTolerance || cr.failed).length} Out-of-Tolerance Area(s) of Concern
              </span>
            </div>
            <span className="text-[11px] font-semibold text-red-300 bg-red-900/40 px-2.5 py-1 rounded-lg border border-red-700/60 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Sensors Highlighted on Schematic</span>
            </span>
          </div>
          <p className="text-red-200/90 text-[11.5px] leading-relaxed">
            All thermocouple sensors exceeding Class {furnaceClass} tolerance (±{analysis.tolerance} {tempUnit}) are highlighted with red alert beacons on the 3D Wire Grid Schematic on the left. Click on any sensor in the table below to inspect its 6-way physical clearances.
          </p>
        </div>
      )}

      {currentSetpoint && analysis && (
        <div className="space-y-6">
          {/* Setpoint Parameters & Live Analysis Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Parameters Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                Survey Setpoint Parameters
              </h4>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Target Temp ({tempUnit})
                  </label>
                  <input
                    type="number"
                    value={currentSetpoint.targetTemp}
                    onChange={(e) =>
                      handleUpdateSetpoint(currentSetpoint.id, {
                        targetTemp: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Soak Duration (min)
                  </label>
                  <input
                    type="number"
                    min="30"
                    value={currentSetpoint.soakDurationMinutes}
                    onChange={(e) =>
                      handleUpdateSetpoint(currentSetpoint.id, {
                        soakDurationMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Full Stability Hold Info */}
                <div className="col-span-2 bg-slate-950/40 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stability Hold Period</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{currentSetpoint.fullHoldDurationMinutes || currentSetpoint.soakDurationMinutes} min</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Hold Start</label>
                      <div className="text-xs font-mono text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                        {currentSetpoint.fullHoldStartTime || currentSetpoint.soakStartTime || '--:--'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Hold End</label>
                      <div className="text-xs font-mono text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                        {currentSetpoint.fullHoldEndTime || currentSetpoint.soakEndTime || '--:--'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Capture Window Info */}
                <div className="col-span-2 bg-emerald-950/10 border border-emerald-900/30 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-emerald-900/20 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Audit Capture Window (30 Min)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        AMS 2750 Rev H
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{currentSetpoint.soakDurationMinutes} min</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-emerald-500/60 mb-0.5">Window Start (Onset of Soak)</label>
                      <input
                        type="text"
                        value={currentSetpoint.soakStartTime}
                        onChange={(e) =>
                          handleUpdateSetpoint(currentSetpoint.id, {
                            soakStartTime: e.target.value,
                            isWindowOverridden: true,
                          })
                        }
                        className="w-full text-xs font-mono text-emerald-200 bg-slate-900 border border-emerald-900/40 px-2 py-1 rounded focus:border-cyan-500 focus:outline-none"
                        placeholder="HH:mm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-emerald-500/60 mb-0.5">Window End</label>
                      <input
                        type="text"
                        value={currentSetpoint.soakEndTime}
                        onChange={(e) =>
                          handleUpdateSetpoint(currentSetpoint.id, {
                            soakEndTime: e.target.value,
                            isWindowOverridden: true,
                          })
                        }
                        className="w-full text-xs font-mono text-emerald-200 bg-slate-900 border border-emerald-900/40 px-2 py-1 rounded focus:border-cyan-500 focus:outline-none"
                        placeholder="HH:mm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                      <span>Auditor Justification / Override Note (Optional)</span>
                      {currentSetpoint.isWindowOverridden && (
                        <span className="text-[9px] text-amber-400 font-medium">Manual Window Active</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={currentSetpoint.windowOverrideNote || ''}
                      onChange={(e) =>
                        handleUpdateSetpoint(currentSetpoint.id, {
                          windowOverrideNote: e.target.value,
                        })
                      }
                      placeholder="e.g. Initial stabilization verified; soak started at burner trim adjustment per SOP-HT-04 § 5.2"
                      className="w-full text-[11px] bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-[10px] text-emerald-400/70 italic flex items-center gap-1">
                    <span>✓ Anchored to initial stabilization at soak onset (eliminates cherry-picking per Nadcap AC7102/8).</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Maximum Observed Overshoot ({tempUnit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentSetpoint.maxOvershootObserved}
                    onChange={(e) =>
                      handleUpdateSetpoint(currentSetpoint.id, {
                        maxOvershootObserved: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">
                    Max permitted: {analysis.maxAllowed} {tempUnit} (Target + Class {furnaceClass} tolerance)
                  </span>
                </div>

                <div className="col-span-2 border-t border-slate-800 pt-3 mt-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Furnace Control Instrument (AMS 2750 Rev H § 3.5.13.3.i & Table 18)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Control Setpoint</label>
                      <input
                        type="number"
                        value={currentSetpoint.controlSetpoint ?? currentSetpoint.targetTemp}
                        onChange={(e) =>
                          handleUpdateSetpoint(currentSetpoint.id, {
                            controlSetpoint: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Control Reading</label>
                      <input
                        type="number"
                        value={currentSetpoint.controlReading ?? currentSetpoint.targetTemp}
                        onChange={(e) =>
                          handleUpdateSetpoint(currentSetpoint.id, {
                            controlReading: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Offset (Max ±{analysis.offsetCompliance?.maxAllowedOffset ?? 10}{tempUnit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={currentSetpoint.controlOffset ?? 0}
                        onChange={(e) =>
                          handleUpdateSetpoint(currentSetpoint.id, {
                            controlOffset: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`w-full bg-slate-950 border rounded px-2 py-1 text-[11px] font-mono focus:outline-none ${
                          analysis.offsetCompliance && !analysis.offsetCompliance.isOffsetCompliant
                            ? 'border-red-500 text-red-400'
                            : 'border-slate-800 text-white focus:border-cyan-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Compliance Uniformity Statistics */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  AMS 2750 Rev H Uniformity Spread & Tolerance Check
                </h4>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono ${
                    analysis.passed
                      ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300'
                      : 'bg-red-950/70 border-red-700/80 text-red-300'
                  }`}
                >
                  {analysis.passed ? 'PASS — CONFORMANT' : 'FAIL — NON-CONFORMANT'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Class {furnaceClass} Tolerance</div>
                  <div className="text-base font-bold font-mono text-cyan-400">
                    ±{analysis.tolerance} {tempUnit}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {analysis.minAllowed} to {analysis.maxAllowed}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Uniformity Spread</div>
                  <div
                    className={`text-base font-bold font-mono ${
                      analysis.uniformitySpread <= analysis.tolerance * 2
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {analysis.uniformitySpread} {tempUnit}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Max: {analysis.tolerance * 2} {tempUnit}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Min Corrected Temp</div>
                  <div className="text-base font-bold font-mono text-slate-200">
                    {analysis.minCorrectedTemp} {tempUnit}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{analysis.minSensorLabel}</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Max Corrected Temp</div>
                  <div className="text-base font-bold font-mono text-slate-200">
                    {analysis.maxCorrectedTemp} {tempUnit}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{analysis.maxSensorLabel}</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed space-y-1.5">
                <div>
                  <span className="font-semibold text-slate-200">AMS 2750 Rev H § 3.5.14.1 Rule:</span> Corrected Temperature = Raw Reading + TC Correction Factor + Instrument Calibration Correction. Every active TUS & furnace sensor must remain within [{analysis.minAllowed} {tempUnit}, {analysis.maxAllowed} {tempUnit}] throughout the ≥30-minute soak, and at no time may any sensor exceed {analysis.maxAllowed} {tempUnit} (no overshoot above upper tolerance per § 3.5.10.6).
                </div>
                {analysis.sensorFailureNote && (
                  <div className={`p-2 rounded-lg border text-[11px] font-medium flex items-start gap-2 ${
                    analysis.passed
                      ? 'bg-amber-950/50 border-amber-700/70 text-amber-200'
                      : 'bg-red-950/60 border-red-700/80 text-red-200'
                  }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>{analysis.sensorFailureNote}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Channel Readings & Corrections Table (Desktop/Tablet) & Card List (Mobile) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Desktop & Landscape Tablet Fluid Table (Zero Horizontal Scroll) */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] xl:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2 w-14 text-center">TC #</th>
                    <th className="py-2.5 px-2.5">Location Description</th>
                    <th className="py-2.5 px-2 text-center">Raw ({tempUnit})</th>
                    <th className="py-2.5 px-2 text-center text-amber-400">TC Corr ({tempUnit})</th>
                    <th className="py-2.5 px-2 text-center font-bold text-cyan-400">Corrected ({tempUnit})</th>
                    <th className="py-2.5 px-2 text-center">Delta</th>
                    <th className="py-2.5 px-2 text-center w-24" title="AMS 2750 Rev H § 3.5.10.2 Open/Broken Sensor Failure Toggle">Sensor State</th>
                    <th className="py-2.5 px-2 text-center w-20">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                  {analysis.channelResults.map((cr) => (
                    <tr
                      key={cr.channelId}
                      onClick={() => {
                        if (onSelectChannel) onSelectChannel(cr.channelId);
                      }}
                      className={`transition-colors cursor-pointer ${
                        cr.failed
                          ? 'bg-slate-950/70 opacity-65 hover:bg-slate-900/60'
                          : !cr.inTolerance
                          ? 'bg-red-950/40 hover:bg-red-900/50 border-l-4 border-red-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                      title={!cr.inTolerance ? 'Click to focus this Area of Concern sensor on the 3D Schematic' : 'Click to select sensor on schematic'}
                    >
                      <td className="py-2 px-2 text-center font-bold text-slate-300">
                        {cr.channelNumber > 0 ? cr.channelNumber : '△'}
                      </td>
                      <td className="py-2 px-2.5 font-sans text-slate-200 truncate max-w-[200px] xl:max-w-none">{cr.label}</td>
                      <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="0.1"
                          disabled={cr.failed}
                          value={cr.rawReading}
                          onChange={(e) =>
                            handleReadingChange(currentSetpoint.id, cr.channelId, e.target.value)
                          }
                          className="w-20 text-center bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="0.05"
                          disabled={cr.failed}
                          value={cr.tcCorrection}
                          onChange={(e) =>
                            handleCorrectionChange(cr.channelId, currentSetpoint.id, e.target.value)
                          }
                          className="w-16 text-center bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-amber-300 focus:border-amber-500 focus:outline-none disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-cyan-300 text-xs xl:text-sm">
                        {cr.failed ? 'OPEN / FAIL' : cr.correctedTemp.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-300">
                        {cr.failed
                          ? '—'
                          : cr.deltaFromTarget >= 0
                          ? `+${cr.deltaFromTarget.toFixed(1)}`
                          : cr.deltaFromTarget.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = channels.map((ch) =>
                              ch.id === cr.channelId ? { ...ch, failed: !ch.failed } : ch
                            );
                            onUpdateChannels(updated);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            cr.failed
                              ? 'bg-amber-600 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                          title="Toggle broken/open circuit sensor state per AMS 2750 Rev H § 3.5.10.2 & § 3.5.14.1.6"
                        >
                          {cr.failed ? 'Failed (Open)' : 'Active'}
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {cr.failed ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                            EXCLUDED
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              cr.inTolerance
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-red-900 text-white border border-red-600 shadow-sm animate-pulse'
                            }`}
                          >
                            {!cr.inTolerance && <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />}
                            {cr.inTolerance ? 'PASS' : 'FAIL'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Portrait Tablet Card View (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {analysis.channelResults.map((cr) => (
                <div
                  key={cr.channelId}
                  onClick={() => {
                    if (onSelectChannel) onSelectChannel(cr.channelId);
                  }}
                  className={`p-3.5 space-y-2.5 cursor-pointer transition-colors ${
                    cr.failed
                      ? 'bg-slate-950/70 opacity-75'
                      : !cr.inTolerance
                      ? 'bg-red-950/40 border-l-4 border-red-500 hover:bg-red-900/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/70'
                  }`}
                  title={!cr.inTolerance ? 'Click to focus this Area of Concern sensor on the 3D Schematic' : 'Click to select sensor'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-cyan-300 shrink-0">
                        {cr.channelNumber > 0 ? `TC ${cr.channelNumber}` : '△ Unassigned'}
                      </span>
                      <span className="text-xs font-medium text-slate-200 truncate">{cr.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = channels.map((ch) =>
                            ch.id === cr.channelId ? { ...ch, failed: !ch.failed } : ch
                          );
                          onUpdateChannels(updated);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                          cr.failed
                            ? 'bg-amber-600 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {cr.failed ? 'Failed (Open)' : 'Active'}
                      </button>
                      {cr.failed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                          EXCLUDED
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            cr.inTolerance
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-red-950 text-red-400 border border-red-800/60'
                          }`}
                        >
                          {cr.inTolerance ? 'PASS' : 'FAIL'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2">
                      <label className="block text-[9px] text-slate-500 uppercase mb-1">
                        Raw ({tempUnit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        disabled={cr.failed}
                        value={cr.rawReading}
                        onChange={(e) =>
                          handleReadingChange(currentSetpoint.id, cr.channelId, e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                      />
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2">
                      <label className="block text-[9px] text-amber-400/80 uppercase mb-1">
                        TC Corr ({tempUnit})
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        disabled={cr.failed}
                        value={cr.tcCorrection}
                        onChange={(e) =>
                          handleCorrectionChange(cr.channelId, currentSetpoint.id, e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 focus:border-amber-500 focus:outline-none disabled:opacity-40"
                      />
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
                      <span className="text-[9px] text-cyan-400/80 uppercase">Corrected</span>
                      <strong className="text-sm text-cyan-300">
                        {cr.failed ? 'OPEN' : `${cr.correctedTemp.toFixed(1)} ${tempUnit}`}
                      </strong>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
                      <span className="text-[9px] text-slate-500 uppercase">Delta Target</span>
                      <strong className="text-sm text-slate-200">
                        {cr.failed
                          ? '—'
                          : cr.deltaFromTarget >= 0
                          ? `+${cr.deltaFromTarget.toFixed(1)} ${tempUnit}`
                          : `${cr.deltaFromTarget.toFixed(1)} ${tempUnit}`}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TUS CSV Import & Dwell Detection Modal */}
      <CsvTusImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        channels={channels}
        setpoints={setpoints}
        furnaceClass={furnaceClass}
        tempUnit={tempUnit}
        meta={meta}
        onApplyImport={handleApplyCsvImport}
      />
    </div>
  );
};
