import React, { useState } from 'react';
import {
  SurveySetpoint,
  ThermocoupleChannel,
  FurnaceClass,
  TempUnit,
  SurveyMetadata,
  TusTrendData,
  DetectedDwellPeriod,
} from '../types/tus';
import { CLASS_TOLERANCES, evaluateSetpoint } from '../utils/ams2750';
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
} from 'lucide-react';
import { CsvTusImportModal } from './CsvTusImportModal';

interface SurveyDataSectionProps {
  setpoints: SurveySetpoint[];
  channels: ThermocoupleChannel[];
  furnaceClass: FurnaceClass;
  tempUnit: TempUnit;
  instrumentError: number;
  meta: SurveyMetadata;
  onUpdateSetpoints: (setpoints: SurveySetpoint[]) => void;
  onUpdateChannels: (channels: ThermocoupleChannel[]) => void;
  onUpdateMeta?: (meta: SurveyMetadata) => void;
  onUpdateTrendData?: (data: TusTrendData[]) => void;
  onUpdateDwellPeriods?: (periods: DetectedDwellPeriod[]) => void;
}

export const SurveyDataSection: React.FC<SurveyDataSectionProps> = ({
  setpoints,
  channels,
  furnaceClass,
  tempUnit,
  instrumentError,
  meta,
  onUpdateSetpoints,
  onUpdateChannels,
  onUpdateMeta,
  onUpdateTrendData,
  onUpdateDwellPeriods,
}) => {
  const [activeSetpointId, setActiveSetpointId] = useState<string>(
    setpoints[0]?.id || ''
  );
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
      soakDurationMinutes: 30,
      soakStartTime: '10:00',
      soakEndTime: '10:30',
      maxOvershootObserved: baseTemp + Math.round((tolerance * 0.3) * 10) / 10,
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

  // Realistic simulation of compliant TUS readings within AMS 2750 Rev H Class limits
  const handleSimulateCompliantData = (spId: string) => {
    const sp = setpoints.find((s) => s.id === spId);
    if (!sp) return;

    const target = sp.targetTemp;
    // Keep variation well within tolerance (e.g., max 60% of class limit)
    const maxOffset = tolerance * 0.55;

    const newReadings: Record<string, number> = {};
    channels.forEach((ch, idx) => {
      // Natural thermal distribution: Top corners tend to be slightly hotter, floor slightly cooler
      const heightBias = ((ch.y - 18) / 36) * (maxOffset * 0.4);
      const randomNoise = (Math.sin(idx * 1.7) * (maxOffset * 0.5));
      const simulatedRaw = Math.round((target + heightBias + randomNoise) * 10) / 10;
      newReadings[ch.id] = simulatedRaw;
    });

    const updated = setpoints.map((s) =>
      s.id === spId
        ? {
            ...s,
            readings: newReadings,
            maxOvershootObserved: target + Math.round((tolerance * 0.35) * 10) / 10,
          }
        : s
    );
    onUpdateSetpoints(updated);
  };

  const currentSetpoint = setpoints.find((s) => s.id === activeSetpointId) || setpoints[0];
  const analysis = currentSetpoint
    ? evaluateSetpoint(currentSetpoint, channels, furnaceClass, tempUnit, instrumentError)
    : null;

  const handleApplyCsvImport = (
    importedSetpoints: SurveySetpoint[],
    intervalSeconds?: number,
    trendData?: TusTrendData[],
    dwellPeriods?: DetectedDwellPeriod[]
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {setpoints.map((sp, idx) => {
            const spAnalysis = evaluateSetpoint(sp, channels, furnaceClass, tempUnit, instrumentError);
            const isActive = sp.id === activeSetpointId;
            return (
              <button
                key={sp.id}
                onClick={() => setActiveSetpointId(sp.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>
                  SP {idx + 1}: {sp.targetTemp} {tempUnit}
                </span>
                {spAnalysis.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
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
          {/* Import TUS CSV Button */}
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Import TUS datalogger CSV, assign columns by TC number, and auto-detect compliant dwells"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import TUS CSV</span>
          </button>

          {currentSetpoint && (
            <>
              <button
                onClick={() => handleSimulateCompliantData(currentSetpoint.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Generate authentic AMS 2750 Rev H compliant test data"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Readings</span>
              </button>
              {setpoints.length > 1 && (
                <button
                  onClick={() => handleDeleteSetpoint(currentSetpoint.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
                  title="Delete this setpoint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

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

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Soak Start Time
                  </label>
                  <input
                    type="time"
                    value={currentSetpoint.soakStartTime}
                    onChange={(e) =>
                      handleUpdateSetpoint(currentSetpoint.id, { soakStartTime: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Soak End Time
                  </label>
                  <input
                    type="time"
                    value={currentSetpoint.soakEndTime}
                    onChange={(e) =>
                      handleUpdateSetpoint(currentSetpoint.id, { soakEndTime: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
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
                    Furnace Control Instrument (AMS 2750 Rev H § 3.5.15.i)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
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
                      <label className="block text-[10px] text-slate-400 mb-1">Instrument Offset</label>
                      <input
                        type="number"
                        step="0.1"
                        value={currentSetpoint.controlOffset ?? 0}
                        onChange={(e) =>
                          handleUpdateSetpoint(currentSetpoint.id, {
                            controlOffset: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white font-mono focus:border-cyan-500 focus:outline-none"
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

              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                <span className="font-semibold text-slate-200">AMS 2750 Rev H Rule:</span> Corrected Temperature = Raw Reading + TC Correction Factor + Instrument Correction Error. Every survey channel must remain within [{analysis.minAllowed} {tempUnit}, {analysis.maxAllowed} {tempUnit}] throughout the verified soak interval.
              </div>
            </div>
          </div>

          {/* Detailed Channel Readings & Corrections Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 w-16 text-center">TC #</th>
                    <th className="py-3 px-3">Location Description</th>
                    <th className="py-3 px-3 text-center">Raw Reading ({tempUnit})</th>
                    <th className="py-3 px-3 text-center text-amber-400">TC Correction ({tempUnit})</th>
                    <th className="py-3 px-3 text-center font-bold text-cyan-400">Corrected Temp ({tempUnit})</th>
                    <th className="py-3 px-3 text-center">Delta From Target</th>
                    <th className="py-3 px-3 text-center w-24">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                  {analysis.channelResults.map((cr) => (
                    <tr
                      key={cr.channelId}
                      className={cr.inTolerance ? 'hover:bg-slate-800/40' : 'bg-red-950/20'}
                    >
                      <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                        {cr.channelNumber}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">{cr.label}</td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={cr.rawReading}
                          onChange={(e) =>
                            handleReadingChange(currentSetpoint.id, cr.channelId, e.target.value)
                          }
                          className="w-24 text-center bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.05"
                          value={cr.tcCorrection}
                          onChange={(e) =>
                            handleCorrectionChange(cr.channelId, currentSetpoint.id, e.target.value)
                          }
                          className="w-20 text-center bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 focus:border-amber-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-cyan-300 text-sm">
                        {cr.correctedTemp.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-300">
                        {cr.deltaFromTarget >= 0 ? `+${cr.deltaFromTarget.toFixed(1)}` : cr.deltaFromTarget.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            cr.inTolerance
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-red-950 text-red-400 border border-red-800/60'
                          }`}
                        >
                          {cr.inTolerance ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
