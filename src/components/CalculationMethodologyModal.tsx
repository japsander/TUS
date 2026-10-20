import React, { useState } from 'react';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  SurveySetpoint,
  TestInstrument,
  SurveyMetadata,
  NadcapCheckItem,
  TempUnit,
  DimUnit,
} from '../types/tus';
import {
  CLASS_TOLERANCES,
  calculateVolumeInM3,
  calculateVolumeInCuFt,
  getMinRequiredSensors,
  getAllowableSensorFailures,
  getMaxAllowedOffset,
  SetpointAnalysisResult,
} from '../utils/ams2750';
import {
  X,
  BookOpen,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Thermometer,
  Layers,
  Sliders,
  Activity,
  FileCheck,
} from 'lucide-react';

interface CalculationMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: SurveyMetadata;
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  channels: ThermocoupleChannel[];
  setpoints: SurveySetpoint[];
  setpointAnalyses: SetpointAnalysisResult[];
  instrument: TestInstrument;
  checklist: NadcapCheckItem[];
  tempUnit: TempUnit;
  dimUnit: DimUnit;
}

export const CalculationMethodologyModal: React.FC<CalculationMethodologyModalProps> = ({
  isOpen,
  onClose,
  meta,
  chamber,
  qwz,
  channels,
  setpoints,
  setpointAnalyses,
  instrument,
  checklist,
  tempUnit,
  dimUnit,
}) => {
  const [activeTab, setActiveTab] = useState<'methodology' | 'live-trace'>('methodology');

  if (!isOpen) return null;

  const volM3 = calculateVolumeInM3(qwz, dimUnit);
  const volCuFt = calculateVolumeInCuFt(qwz, dimUnit);
  const sensorReq = getMinRequiredSensors(volCuFt, volM3, meta.furnaceClass);
  const classTol = CLASS_TOLERANCES[meta.furnaceClass][tempUnit];
  const mpeLimit = tempUnit === '°C' ? 0.6 : 1.1;
  const failedChannels = channels.filter((c) => c.failed);
  const activeChannels = channels.filter((c) => !c.failed);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-white text-base sm:text-lg">
                  Auditor Calculation &amp; Pass/Fail Methodology Reference
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                  AMS 2750 Rev H &amp; Nadcap AC7102/8
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete mathematical formulas, standard clause citations, soak/overshoot algorithms, and live pass/fail decision trace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('methodology')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'methodology'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Formulas &amp; Rules</span>
              </button>
              <button
                onClick={() => setActiveTab('live-trace')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'live-trace'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Live Survey Audit Trace</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === 'methodology' ? (
            <>
              {/* Overview Banner */}
              <div className="bg-indigo-950/30 border border-indigo-800/60 rounded-xl p-4 text-slate-300 leading-relaxed">
                <div className="font-bold text-indigo-300 text-sm mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Deterministic Compliance Architecture (Zero Subjective Override)</span>
                </div>
                <p>
                  Every PASS / FAIL determination in this application is computed deterministically from{' '}
                  <strong className="text-white">SAE AMS 2750 Rev H</strong> and{' '}
                  <strong className="text-white">Nadcap AC7102/8</strong> requirements. A survey is certified{' '}
                  <span className="text-emerald-400 font-bold">PASS — CONFORMANT</span> if and only if{' '}
                  <strong className="text-white">all 10 Nadcap AC7102/8 audit gates</strong> and{' '}
                  <strong className="text-white">every surveyed temperature setpoint</strong> simultaneously satisfy
                  the mathematical criteria documented below.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Corrected Sensor Temperature & Spread */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold text-white text-sm">
                        1. Corrected Temperature &amp; Uniformity Spread
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                      § 3.5.14.1 &amp; Table 18
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    For each active thermocouple channel <code className="text-cyan-300">i</code> at setpoint{' '}
                    <code className="text-cyan-300">T_target</code>, the raw reading (or 30-minute capture window mean
                    when imported from a datalogger CSV) is arithmetically corrected using the thermocouple wire batch
                    calibration factor and field test instrument correction factor:
                  </p>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] space-y-1.5 text-slate-200">
                    <div>
                      <span className="text-slate-400">Corrected Temp: </span>
                      <strong className="text-cyan-300">
                        T_corr(i) = round_0.1( T_raw(i) + Δ_TC_wire(i) + Δ_instrument )
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Deviation: </span>
                      <strong className="text-slate-200">ΔT(i) = T_corr(i) - T_target</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Uniformity Spread: </span>
                      <strong className="text-emerald-300">
                        Spread = max(T_corr) - min(T_corr)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Allowed Band: </span>
                      <strong className="text-amber-300">
                        [ T_target - Tol_class , T_target + Tol_class ]
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="font-semibold text-slate-200">Class Uniformity Tolerances (Table 18):</div>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] pt-1">
                      <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Class 1: <span className="text-white">±3°C / ±5°F</span>
                      </div>
                      <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Class 2: <span className="text-white">±6°C / ±10°F</span>
                      </div>
                      <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Class 3: <span className="text-white">±8°C / ±15°F</span>
                      </div>
                      <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Class 4: <span className="text-white">±10°C / ±20°F</span>
                      </div>
                      <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Class 5: <span className="text-white">±14°C / ±25°F</span>
                      </div>
                      <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Class 6: <span className="text-white">±28°C / ±50°F</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Soak Detection, True Soak End & 30-Min Window Selection */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-white text-sm">
                        2. Soak Window Selection &amp; Ramp-Up Separation
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-slate-700">
                      § 3.5.10.6 &amp; § 3.5.10.9
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    When analysing continuous CSV datalogger records, the engine separates the{' '}
                    <strong className="text-white">Full Physical Soak Period</strong>, the{' '}
                    <strong className="text-white">30-Minute Evaluation Capture Window</strong>, and the{' '}
                    <strong className="text-white">Departure Ramp-Up</strong> to the next setpoint:
                  </p>

                  <ul className="space-y-2 text-slate-300 list-disc pl-4">
                    <li>
                      <strong className="text-white">Dwell Identification (With Out-of-Tolerance Fallback):</strong>{' '}
                      Searches sequentially for a contiguous hold of at least <code className="text-cyan-300">30 min</code>{' '}
                      within strict class tolerance <code className="text-cyan-300">±Tol_class</code>. If a furnace fails
                      strict tolerance during a soak, the detector progressively widens the search envelope so the physical
                      soak is still captured and reported as <span className="text-red-400 font-bold">FAIL</span> rather than
                      omitted.
                    </li>
                    <li>
                      <strong className="text-white">True Soak End Detection:</strong>{' '}
                      Tracks the full stabilized hold at the setpoint until the furnace departs. If the hold exits via a
                      sustained monotonic ramp-up to the next setpoint (or final cooldown), the algorithm backtracks along
                      the continuous departure slope (<code className="text-cyan-300">ΔT_mean ≥ +0.15°/step</code> or{' '}
                      <code className="text-cyan-300">≥ +0.40°/3-steps</code>) to pinpoint the exact row{' '}
                      <code className="text-cyan-300">soakEndIndex</code> where the steady soak ended and the next ramp began.
                    </li>
                    <li>
                      <strong className="text-white">30-Minute Capture Window & Anti-Cherry-Picking (AMS 2750 Rev H / Nadcap):</strong>{' '}
                      Per AMS 2750 Rev H § 3.5.13 and Nadcap AC7102/8 § 4.1, the 30-minute evaluation window must be anchored strictly to initial thermal stabilization at the onset of soak (within max 25 minutes of entering the setpoint plateau, once <code className="text-cyan-300">dMin/dt ≤ 0.20°C/min</code>). The algorithm is strictly prohibited from scanning downstream into an extended soak to cherry-pick passing windows. If any thermocouple is out of tolerance during this qualified initial window, the survey reports an honest Non-Conformance (FAIL). Any manual window shifts require documented pyrometry justification.
                    </li>
                  </ul>
                </div>

                {/* 3. Maximum Overshoot Evaluation */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-white text-sm">
                        3. Maximum Overshoot Criterion
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
                      § 3.5.10.6 &amp; § 3.5.14.1.6
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    Per AMS 2750 Rev H § 3.5.10.6 and § 3.5.14.1.6, at no time during approach to or during the soak at
                    a test temperature shall any TUS sensor exceed the upper uniformity tolerance limit.
                  </p>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] space-y-1.5 text-slate-200">
                    <div>
                      <span className="text-slate-400">Evaluation Span: </span>
                      <strong className="text-cyan-300">
                        t ∈ [ prevSetpointSoakEnd + 1 .. currentSetpointSoakEnd ]
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Max Overshoot: </span>
                      <strong className="text-amber-300">
                        T_overshoot = max( T_sensor(t, i) ) across all active channels i
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Pass Criterion: </span>
                      <strong className="text-emerald-300">
                        T_overshoot ≤ T_target + Tol_class
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <strong className="text-slate-200">Why this matters to auditors:</strong> Any overshoot occurring{' '}
                    <em>before</em> or <em>after</em> the 30-minute capture window while still soaking at the setpoint is
                    captured and flagged, while the intentional ramp-up to the next higher setpoint (after{' '}
                    <code className="text-cyan-300">currentSetpointSoakEnd</code>) is never falsely flagged as overshoot
                    of the lower setpoint.
                  </p>
                </div>

                {/* 4. QWZ Volume & Minimum Required Sensors */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-white text-sm">
                        4. Work Zone Volume &amp; Minimum TUS Sensors
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-blue-300 border border-slate-700">
                      Table 18 &amp; Note 1 (p. 48)
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    Minimum required TUS sensors are determined from the Qualified Work Zone (QWZ) volume in cubic feet (
                    <code className="text-cyan-300">ft³</code>) or cubic metres (<code className="text-cyan-300">m³</code>)
                    per AMS 2750 Rev H Table 18 and Note 1:
                  </p>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] space-y-1.5 text-slate-200">
                    <div>
                      <span className="text-slate-400">Volume ≤ 225 ft³ (6.4 m³): </span>
                      <strong className="text-cyan-300">Min Sensors = 9 (Table 18 Lookup)</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Volume &gt; 225 ft³ (6.4 m³): </span>
                      <strong className="text-emerald-300">
                        Min Sensors = 9 + ceil( F × √(Vol_ft³ - 225) )
                      </strong>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      where <strong className="text-white">F = 0.5 (1/2)</strong> for Class 1 &amp; Class 2 furnaces, and{' '}
                      <strong className="text-white">F = 0.25 (1/4)</strong> for Class 3, 4, 5 &amp; 6 furnaces.
                    </div>
                  </div>
                </div>

                {/* 5. Sensor Failure Rules */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <h3 className="font-bold text-white text-sm">
                        5. TUS Sensor Failure Evaluation Rules
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-rose-300 border border-slate-700">
                      § 3.5.13 &amp; Tables 20 / 21
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    When one or more TUS sensors are marked failed/open, the survey is automatically evaluated against
                    all four mandatory provisions of AMS 2750 Rev H § 3.5.13.1, § 3.5.13.2, Table 20, and Table 21:
                  </p>

                  <ol className="space-y-1.5 text-slate-300 list-decimal pl-4">
                    <li>
                      <strong className="text-white">No Corner / Periphery Failure (§ 3.5.13.1 &amp; § 3.5.13.2):</strong>{' '}
                      Failure at any of the 8 QWZ corner locations is strictly prohibited.
                    </li>
                    <li>
                      <strong className="text-white">No Control / Recording Sensor Failure (§ 3.5.13.1):</strong>{' '}
                      Any sensor designated as a control/recording channel cannot fail.
                    </li>
                    <li>
                      <strong className="text-white">No Two Adjacent Failed Sensors (§ 3.5.13.2):</strong>{' '}
                      No two sensors connected as adjacent neighbours in the 3D work zone grid may fail simultaneously.
                    </li>
                    <li>
                      <strong className="text-white">Allowable Failure Count (Tables 20 &amp; 21):</strong>
                      <div className="grid grid-cols-2 gap-2 mt-1.5 font-mono text-[10px]">
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <div className="text-cyan-300 font-bold mb-1">Table 20 (&lt; 1093°C / 2000°F)</div>
                          <div>3–9 sensors: 0 allowed</div>
                          <div>10–16 sensors: 1 allowed</div>
                          <div>17–23 sensors: 2 allowed</div>
                          <div>24–39 sensors: 3 allowed</div>
                          <div>≥ 40 sensors: ≤ 10%</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <div className="text-amber-300 font-bold mb-1">Table 21 (≥ 1093°C / 2000°F)</div>
                          <div>3–5 sensors: 0 allowed</div>
                          <div>6–9 sensors: 1 allowed</div>
                          <div>10–16 sensors: 2 allowed</div>
                          <div>17–23 sensors: 3 allowed</div>
                          <div>24–39: 4 | ≥ 40: ≤ 10%</div>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* 6. Modification Offsets, MPE & Logging Frequency */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <h3 className="font-bold text-white text-sm">
                        6. Permitted Offsets, Instrument MPE &amp; Logging
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-700">
                      Tables 7, 15, 16 &amp; § 3.5.10.7
                    </span>
                  </div>

                  <ul className="space-y-2 text-slate-300 list-disc pl-4">
                    <li>
                      <strong className="text-white">Max Permitted Modification Offset (Tables 15 &amp; 16):</strong>{' '}
                      Applied control offset <code className="text-cyan-300">|Δ_offset|</code> must not exceed:
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] mt-1">
                        <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          Class 1: <span className="text-white">±1.5°C / ±2.5°F</span>
                        </div>
                        <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          Class 2: <span className="text-white">±3.0°C / ±5.0°F</span>
                        </div>
                        <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          Class 3: <span className="text-white">max(±5°C/8°F, 0.38%)</span>
                        </div>
                        <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          Class 4: <span className="text-white">max(±6°C/10°F, 0.38%)</span>
                        </div>
                        <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          Class 5: <span className="text-white">max(±7°C/13°F, 0.38%)</span>
                        </div>
                        <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          Class 6: <span className="text-white">0.75% of Temp</span>
                        </div>
                      </div>
                    </li>
                    <li>
                      <strong className="text-white">Field Test Instrument MPE (Table 7):</strong>{' '}
                      Instrument maximum permissible error must satisfy{' '}
                      <code className="text-cyan-300">MPE ≤ ±0.6°C (±1.1°F)</code> with valid ISO/IEC 17025 (UKAS/NIST)
                      traceability.
                    </li>
                    <li>
                      <strong className="text-white">Data Logging Frequency (§ 3.5.10.7):</strong>{' '}
                      Interval between recorded readings across all TUS channels must satisfy{' '}
                      <code className="text-cyan-300">0 &lt; Δt_log ≤ 120 seconds (2 minutes)</code>.
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            /* LIVE SURVEY AUDIT TRACE TAB */
            <div className="space-y-4">
              {/* Top Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400 font-mono uppercase">
                    Live Audit Evaluation Trace — Furnace {meta.furnaceId || 'Unassigned'} (Class {meta.furnaceClass}
                    {meta.instrumentationType})
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    QWZ Volume: {volM3.toFixed(3)} m³ ({volCuFt.toFixed(1)} ft³) • Required Sensors:{' '}
                    {sensorReq.minSensors} • Configured: {channels.length} ({activeChannels.length} Active,{' '}
                    {failedChannels.length} Failed)
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">{sensorReq.formulaBreakdown}</div>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-bold flex items-center gap-2 shrink-0 ${
                    checklist.every((c) => c.compliant) &&
                    setpointAnalyses.length > 0 &&
                    setpointAnalyses.every((s) => s.passed)
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      : 'bg-red-950/80 border-red-700 text-red-300'
                  }`}
                >
                  {checklist.every((c) => c.compliant) &&
                  setpointAnalyses.length > 0 &&
                  setpointAnalyses.every((s) => s.passed) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>OVERALL STATUS: PASS</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span>OVERALL STATUS: FAIL / ACTION REQUIRED</span>
                    </>
                  )}
                </div>
              </div>

              {/* Per-Setpoint Live Calculation Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <span>Setpoint-by-Setpoint Mathematical Evaluation ({setpoints.length} Setpoints)</span>
                </h3>

                {setpointAnalyses.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
                    No survey setpoints are currently loaded. Add a setpoint or import a CSV in Step 6 to view live
                    setpoint calculations.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {setpointAnalyses.map((sa) => {
                      const sp = setpoints.find((s) => s.id === sa.setpointId);
                      const outOfTolChannels = sa.channelResults.filter((c) => !c.failed && !c.inTolerance);
                      const overshootLimit = sa.targetTemp + sa.tolerance;
                      const overshootPass = sa.maxOvershoot <= overshootLimit;
                      const offsetPass = sa.offsetCompliance ? sa.offsetCompliance.isOffsetCompliant : true;
                      const allowFail = getAllowableSensorFailures(channels.length, sa.targetTemp, tempUnit);

                      return (
                        <div
                          key={sa.setpointId}
                          className={`bg-slate-950 border rounded-xl p-4 space-y-3 ${
                            sa.passed ? 'border-emerald-800/60' : 'border-red-800/70'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              {sa.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className="font-bold text-white text-sm font-mono">
                                Setpoint {sa.targetTemp}
                                {tempUnit} (Class {meta.furnaceClass} Allowed Band: {sa.minAllowed.toFixed(1)}
                                {tempUnit} to {sa.maxAllowed.toFixed(1)}
                                {tempUnit})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              {sp?.soakStartTime && sp?.soakEndTime && (
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                                  Window: {sp.soakStartTime} ➔ {sp.soakEndTime} ({sp.soakDurationMinutes}m)
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-0.5 rounded font-bold border ${
                                  sa.passed
                                    ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                                    : 'bg-red-950 border-red-800 text-red-300'
                                }`}
                              >
                                {sa.passed ? 'SETPOINT PASS' : 'SETPOINT FAIL'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 font-mono text-[11px]">
                            {/* Criterion 1: Uniformity Range */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>1. Corrected Extremes</span>
                                <span
                                  className={
                                    outOfTolChannels.length === 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                                  }
                                >
                                  {outOfTolChannels.length === 0 ? 'PASS' : `FAIL (${outOfTolChannels.length} ch)`}
                                </span>
                              </div>
                              <div className="text-white">
                                Min: <strong>{sa.minCorrectedTemp.toFixed(1)}{tempUnit}</strong> ({sa.minSensorLabel})
                              </div>
                              <div className="text-white">
                                Max: <strong>{sa.maxCorrectedTemp.toFixed(1)}{tempUnit}</strong> ({sa.maxSensorLabel})
                              </div>
                              <div className="text-slate-400">
                                Spread: <strong className="text-cyan-300">{sa.uniformitySpread.toFixed(1)}{tempUnit}</strong>
                              </div>
                            </div>

                            {/* Criterion 2: Max Overshoot */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>2. Max Overshoot (§ 3.5.10.6)</span>
                                <span className={overshootPass ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                  {overshootPass ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="text-white">
                                Observed: <strong>{sa.maxOvershoot.toFixed(1)}{tempUnit}</strong>
                              </div>
                              <div className="text-white">
                                Max Limit: <strong>{overshootLimit.toFixed(1)}{tempUnit}</strong>
                              </div>
                              <div className="text-slate-400">
                                Margin:{' '}
                                <strong className={overshootPass ? 'text-emerald-300' : 'text-red-400'}>
                                  {(sa.maxOvershoot - overshootLimit) > 0
                                    ? `+${(sa.maxOvershoot - overshootLimit).toFixed(1)}${tempUnit} OVER`
                                    : `${(sa.maxOvershoot - overshootLimit).toFixed(1)}${tempUnit}`}
                                </strong>
                              </div>
                            </div>

                            {/* Criterion 3: Modification Offset */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>3. Control Offset</span>
                                <span className={offsetPass ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                  {offsetPass ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="text-white">
                                Applied: <strong>{sa.offsetCompliance?.offsetApplied ?? 0}{tempUnit}</strong>
                              </div>
                              <div className="text-white">
                                Max Permitted:{' '}
                                <strong>
                                  ±{getMaxAllowedOffset(meta.furnaceClass, tempUnit, meta.furnaceApplication, sa.targetTemp)}
                                  {tempUnit}
                                </strong>
                              </div>
                              <div className="text-slate-400">
                                Instrument Corr: <strong className="text-slate-200">{instrument.instrumentCorrection ?? 0}{tempUnit}</strong>
                              </div>
                            </div>

                            {/* Criterion 4: Sensor Failure Provision */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>4. Sensor Failures (§ 3.5.13)</span>
                                <span
                                  className={
                                    !sa.sensorFailureNote?.includes('Violation')
                                      ? 'text-emerald-400 font-bold'
                                      : 'text-red-400 font-bold'
                                  }
                                >
                                  {!sa.sensorFailureNote?.includes('Violation') ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="text-white">
                                Failed Sensors: <strong>{failedChannels.length} of {channels.length}</strong>
                              </div>
                              <div className="text-white">
                                Max Allowed: <strong>{allowFail.maxAllowedFailures} ({allowFail.tableName.split(' ')[0]} {allowFail.tableName.split(' ')[1]})</strong>
                              </div>
                              <div className="text-slate-400">
                                Active Sensors: <strong className="text-slate-200">{activeChannels.length} (Min {sensorReq.minSensors})</strong>
                              </div>
                            </div>
                          </div>

                          {outOfTolChannels.length > 0 && (
                            <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-2.5 text-[11px] font-mono text-red-200">
                              <strong>Out-of-Tolerance Channels ({outOfTolChannels.length}): </strong>
                              {outOfTolChannels
                                .map(
                                  (c) =>
                                    `TC ${c.channelNumber} (${c.rawReading.toFixed(1)} + ${c.tcCorrection.toFixed(1)} = ${c.correctedTemp.toFixed(1)}${tempUnit})`
                                )
                                .join(', ')}
                            </div>
                          )}

                          {sa.sensorFailureNote && (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-300">
                              {sa.sensorFailureNote}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 10-Point Nadcap Audit Gate Breakdown */}
              <div className="space-y-2.5 pt-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>10-Point Nadcap AC7102/8 Automated Gate Reasoning</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        item.compliant
                          ? 'bg-slate-950/90 border-slate-800'
                          : 'bg-red-950/30 border-red-800/60'
                      }`}
                    >
                      {item.compliant ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">
                            {item.code}
                          </span>
                          <span className="font-semibold text-white text-xs">{item.question}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Active Standard: SAE AMS 2750 Rev H / Nadcap AC7102/8 • Class {meta.furnaceClass} (±{classTol}
            {tempUnit}) • Table 7 Field MPE ≤ ±{mpeLimit}
            {tempUnit}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Auditor Reference
          </button>
        </div>
      </div>
    </div>
  );
};
