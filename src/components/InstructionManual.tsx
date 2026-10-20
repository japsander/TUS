import React, { useState } from 'react';
import {
  BookOpen,
  Wrench,
  Box,
  Thermometer,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass,
  Settings,
  Layers,
  Clock,
  HelpCircle,
  Save,
  Upload,
} from 'lucide-react';
import { TempUnit, DimUnit } from '../types/tus';

interface InstructionManualProps {
  tempUnit: TempUnit;
  dimUnit: DimUnit;
  onNavigateTab: (tab: string) => void;
}

export const InstructionManual: React.FC<InstructionManualProps> = ({
  tempUnit,
  dimUnit,
  onNavigateTab,
}) => {
  const [activeGuideTab, setActiveGuideTab] = useState<'operator-guide' | 'tables' | 'faq'>('operator-guide');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-900/50 rounded-2xl p-6 shadow-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  SAE AMS 2750 Rev H & Nadcap AC7102/8 Operator Guide
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  REV H (2024) VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Clear, plain-English step-by-step instructions for setting up the furnace, rigging TUS sensors, running the survey, and interpreting Pass/Fail results.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('meta')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <span>Start Step 2: Furnace ID</span> <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveGuideTab('operator-guide')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'operator-guide'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span>1. Step-by-Step Operator Guide</span>
        </button>
        <button
          onClick={() => setActiveGuideTab('tables')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'tables'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>2. AMS 2750 Rev H Reference Tables</span>
        </button>
        <button
          onClick={() => setActiveGuideTab('faq')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'faq'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>3. Pass/Fail Rules & Operator Q&A</span>
        </button>
      </div>

      {/* Quick Jump Cards to App Steps */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <div
          onClick={() => onNavigateTab('meta')}
          className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-3 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">Step 2</span>
          </div>
          <div className="font-bold text-xs text-slate-100">Furnace & ID</div>
          <div className="text-[10px] text-slate-400">Class, Type & Due Date</div>
        </div>

        <div
          onClick={() => onNavigateTab('equipment')}
          className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-3 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">Step 3</span>
          </div>
          <div className="font-bold text-xs text-slate-100">Test Recorder</div>
          <div className="text-[10px] text-slate-400">Cal Dates & MPE (Table 7)</div>
        </div>

        <div
          onClick={() => onNavigateTab('visual')}
          className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/60 rounded-xl p-3 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <Box className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-blue-300 border border-slate-800">Step 4</span>
          </div>
          <div className="font-bold text-xs text-slate-100">Chamber & QWZ</div>
          <div className="text-[10px] text-slate-400">Size & Table 17 Sensors</div>
        </div>

        <div
          onClick={() => onNavigateTab('channels')}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/60 rounded-xl p-3 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800">Step 5</span>
          </div>
          <div className="font-bold text-xs text-slate-100">Sensor Rigging</div>
          <div className="text-[10px] text-slate-400">TC Wire Lots & Failed TCs</div>
        </div>

        <div
          onClick={() => onNavigateTab('survey')}
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-3 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <Thermometer className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 border border-slate-800">Step 6</span>
          </div>
          <div className="font-bold text-xs text-slate-100">Survey Data</div>
          <div className="text-[10px] text-slate-400">CSV Import & Soak Check</div>
        </div>

        <div
          onClick={() => onNavigateTab('nadcap')}
          className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/60 rounded-xl p-3 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-purple-300 border border-slate-800">Step 7</span>
          </div>
          <div className="font-bold text-xs text-slate-100">Audit & Export</div>
          <div className="text-[10px] text-slate-400">Checklist & Word Report</div>
        </div>
      </div>

      {/* TAB 1: STEP-BY-STEP OPERATOR GUIDE */}
      {activeGuideTab === 'operator-guide' && (
        <div className="space-y-5 text-xs text-slate-300">
          {/* Plain-English Overview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>What is a Temperature Uniformity Survey (TUS) in Simple Terms?</span>
            </h2>
            <p className="leading-relaxed text-slate-300">
              A <strong className="text-white">Temperature Uniformity Survey (TUS)</strong> (defined in <strong className="text-cyan-300">AMS 2750 Rev H Section 3.5</strong>) is a test that proves every part of your furnace's working area heats evenly to the target temperature. Even if your furnace wall controller says <span className="font-mono text-white">500°C</span>, corners near the door might be colder and areas near the heaters might be hotter. During a TUS, we place calibrated test thermocouples throughout the <strong className="text-white">Qualified Work Zone (QWZ)</strong>, heat the furnace to your test temperatures, hold it steady for at least <strong className="text-emerald-300">30 minutes</strong>, and verify that every active sensor stays within your furnace's allowed tolerance band (for example, <strong className="text-cyan-300">±10°F / ±6°C</strong> for a Class 2 furnace).
            </p>
          </div>

          {/* PHASE 1: BEFORE YOU START */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-cyan-950 border border-cyan-700 rounded-lg text-cyan-300 font-bold font-mono text-xs">
                  PHASE 1
                </span>
                <h3 className="text-sm font-bold text-white">
                  Pre-Survey Checks: Furnace Class, Setpoints & Test Equipment (AMS 2750H § 3.1, § 3.2, § 3.3, § 3.5.2, § 3.5.3)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('meta')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Go to Step 2 & 3</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">1. Identify Furnace Class, Instrumentation Type & Category</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Furnace Class (Table 8, p. 28):</strong> Sets your allowed temperature uniformity tolerance:
                    <br />
                    <span className="font-mono text-[11px] text-slate-400">
                      Class 1: ±5.0°F (±3.0°C) | Class 2: ±10.0°F (±6.0°C) | Class 3: ±15.0°F (±8.0°C) | Class 4: ±20.0°F (±10.0°C) | Class 5: ±25.0°F (±14.0°C) | Class 6: ±50.0°F (±28.0°C)
                    </span>
                  </li>
                  <li>
                    <strong className="text-white">Instrumentation Type (Table 9 & Table 10, pp. 28–29):</strong> Select <span className="font-mono text-amber-300">Type A, B, C, D+, D, or E</span> based on the control, recording, load, and over-temperature sensors installed in each control zone.
                  </li>
                  <li>
                    <strong className="text-white">Application Category:</strong> Choose <strong className="text-emerald-300">Parts (Table 15, p. 39)</strong> or <strong className="text-emerald-300">Raw Material (Table 16, p. 40)</strong>. This determines your normal and extended periodic TUS intervals, required consecutive successful periodic TUS count, and maximum permitted offset.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">2. Choose Survey Temperatures (§ 3.5.2 & § 3.5.3, p. 41)</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Initial TUS (§ 3.5.2.1 & § 3.5.2.2):</strong> Perform at the <strong>minimum and maximum</strong> temperatures of each qualified operating range, plus intermediate temperatures so no two adjacent TUS temperatures are more than <strong className="text-amber-300">600°F (335°C)</strong> apart.
                  </li>
                  <li>
                    <strong className="text-white">Periodic TUS (§ 3.5.3.1 – § 3.5.3.3.1):</strong> Test at any temperature within each range (and hit the min and max of each range at least <strong>annually</strong>). If a single operating range exceeds <strong className="text-amber-300">600°F (335°C)</strong>, each periodic TUS must include one temperature within <strong>300°F (170°C)</strong> of the minimum, one within <strong>300°F (170°C)</strong> of the maximum, and no more than <strong>600°F (335°C)</strong> between adjacent test temperatures.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">3. Verify Field Test Recorder Calibration (Table 7, p. 22)</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    Check the calibration certificate on your portable TUS field test instrument. Under <strong className="text-white">AMS 2750 Rev H Table 7</strong>, Field Test Instruments must be calibrated <strong className="text-amber-300">Quarterly (every 3 months)</strong> against a primary or secondary standard instrument.
                  </li>
                  <li>
                    <strong className="text-white">Calibration Accuracy (Table 7):</strong> Must meet <strong className="text-emerald-300">±1.0°F or ±0.6°C or ±0.1% of reading</strong>, whichever is greater, with digital readability of at least <strong>0.1°F or 0.1°C</strong> (§ 3.2.2.2).
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">4. Verify TUS Thermocouple Wire & Reuse Limits (Table 5 & § 3.1.7, pp. 16–18)</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Calibration Interval (§ 3.1.4.6):</strong> Calibration points on the wire certificate shall not exceed <strong className="text-cyan-300">250°F or 140°C</strong> intervals, and extrapolation beyond the highest/lowest calibrated point is prohibited (§ 3.1.4.7).
                  </li>
                  <li>
                    <strong className="text-white">Expendable Base Metal & Refractory TUS Wire Reuse (§ 3.1.7.2 & § 3.1.7.3):</strong>
                    <br />
                    • <strong className="text-emerald-300">Used exclusively ≤ 500.0°F (260.0°C):</strong> Up to <strong>3 months (Quarterly)</strong> from first use, unlimited uses.
                    <br />
                    • <strong className="text-amber-300">Used between 500.0°F and 1200.0°F (260.0°C to 650.0°C):</strong> Types <strong>M, C, T, K, E</strong> are limited to <strong>3 months or 5 uses</strong> (whichever comes first); Types <strong>J and N</strong> are limited to <strong>3 months or 10 uses</strong> (whichever comes first).
                    <br />
                    • <strong className="text-red-300">Used above 1200.0°F (650.0°C):</strong> Limited to a <span className="underline text-white font-bold">SINGLE USE ONLY (1 use)</span>!
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* PHASE 2: SETTING UP THE FURNACE & RIGGING SENSORS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-blue-950 border border-blue-700 rounded-lg text-blue-300 font-bold font-mono text-xs">
                  PHASE 2
                </span>
                <h3 className="text-sm font-bold text-white">
                  Setting Up the Furnace & Rigging TUS Sensors (AMS 2750H § 3.5.6 – § 3.5.9, Table 17 & Table 18, pp. 43–46)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('visual')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Go to Step 4 & 5</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-blue-300">1. How Many TUS Sensors Do I Need? (Table 17 & Table 18)</div>
                  <p className="text-slate-300 leading-relaxed">
                    Enter the <strong className="text-white">Qualified Work Zone (QWZ)</strong> dimensions in <strong className="text-white">Step 4</strong>. Per <strong className="text-cyan-300">Table 17 (p. 44) & Table 18 (p. 45)</strong>:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[11px]">
                    <li>&lt; 3 ft³ (&lt; 0.085 m³): <strong className="text-white">5 sensors min</strong> (4 corners + 1 center per Fig. 1; 9 sensors optional per Note 1)</li>
                    <li>≥ 3 to &lt; 225 ft³ (0.085 to &lt; 6.4 m³): <strong className="text-white">9 sensors min</strong> (8 corners + 1 center)</li>
                    <li>≥ 225 ft³ (≥ 6.4 m³): <strong className="text-white">See Table 18</strong> (14 to 40+ sensors for Class 1–2; 12 to 25+ sensors for Class 3–6)</li>
                  </ul>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-blue-300">2. Where Do I Place the Sensors? (Table 17 & Figure 1)</div>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                    <li>
                      <strong className="text-white">Defining Work Zone Extremities (§ 3.5.1.4):</strong> The measuring junctions of the corner sensors (or periphery sensors in a cylinder) define the outer boundaries of the Qualified Work Zone—no production parts may extend beyond them.
                    </li>
                    <li>
                      <strong className="text-white">Volumes ≥ 3 to &lt; 225 ft³:</strong> 8 corners + 1 center. For volumes ≥ 225 ft³, distribute the additional Table 18 sensors uniformly throughout the work zone (or around the periphery if radiant heat from the walls is used, per § 3.5.9.2).
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-blue-300">3. Furnace Setup & Load Rules (§ 3.5.6 – § 3.5.8)</div>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                    <li>
                      <strong className="text-white">Load Method Consistency (§ 3.5.8.1):</strong> A TUS may be run with a production load, simulated load, rack, or empty. Once established on the Initial TUS, every Periodic TUS must use that <strong>exact same method</strong>.
                    </li>
                    <li>
                      <strong className="text-white">Heat Sinks (§ 3.5.8.2):</strong> If surveying empty or with a rack using heat sinks, thickness/diameter shall not exceed <strong>0.5 in (13 mm)</strong> or the thinnest material processed.
                    </li>
                    <li>
                      <strong className="text-white">Cold Furnace Rule (§ 3.5.7.2):</strong> If parts are normally loaded into a cold furnace, preheating the furnace prior to the coldest TUS temperature is <strong>prohibited</strong>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* PHASE 3: RUNNING THE TUS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-700 rounded-lg text-emerald-300 font-bold font-mono text-xs">
                  PHASE 3
                </span>
                <h3 className="text-sm font-bold text-white">
                  Running the Survey: Data Collection, Stabilization, Overshoot & 30-Minute Soak (AMS 2750H § 3.5.10, p. 47)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('survey')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Go to Step 6: Survey Data</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="font-bold text-emerald-300">Step-by-Step Execution at the Furnace (§ 3.5.10):</div>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>
                    <strong className="text-white">When to Start Logging (§ 3.5.10.1):</strong> Begin data collection when all TUS and furnace sensors are at least <strong className="text-cyan-300">100°F or 55°C below</strong> each TUS setpoint (or at ambient temperature prior to heating if the TUS setpoint is ≤ 200°F / 93°C).
                  </li>
                  <li>
                    <strong className="text-white">Logging Frequency ≤ 2 Minutes (§ 3.5.10.2 & § 3.5.10.5):</strong> Record all TUS sensors simultaneously at least once every <strong className="text-cyan-300">2 minutes</strong>. Process control/recording sensors must be recorded in their normal production format (not exceeding 5-minute intervals).
                  </li>
                  <li>
                    <strong className="text-white">Wait for Stabilization (§ 2.4.71 & § 3.5.10.6):</strong> Hold the furnace at the TUS setpoint until all TUS, control, and recording sensors are within the allowable tolerance band and are not exhibiting a continual upward or downward trend away from setpoint.
                  </li>
                  <li>
                    <strong className="text-white">Collect Minimum 30-Minute Soak (§ 3.5.10.6):</strong> After stabilization is achieved, continue data collection for a <strong className="text-emerald-300">minimum of 30 additional minutes</strong>.
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Critical Rules During the Run (AMS 2750H § 3.5.10.6 & § 3.5.14):</span>
                </div>
                <div className="space-y-2.5 text-slate-300">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <strong className="text-white block">Zero Overshoot Above Upper Tolerance (§ 3.5.10.6, § 3.5.14.1.2 & § 3.5.14.1.6):</strong>
                    At <strong>no time</strong> during approach or the minimum 30-minute soak period shall any TUS, control, or recording sensor exceed the upper TUS tolerance (<span className="font-mono text-amber-300">Target + Class Tolerance</span>). If any overshoot above upper tolerance occurs during approach or soak, it must be noted on the report and documented as a <strong className="text-red-400">FAILED TUS</strong>!
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <strong className="text-white block">Unloaded vs. Loaded Trend Rule (§ 3.5.10.6.1 & § 3.5.10.6.2):</strong>
                    For <strong>unloaded/empty</strong> equipment, if any TUS sensor shows an upward or downward trend not converging toward setpoint, extend the soak until the trend stops. For <strong>loaded</strong> equipment, a slow rise of load/TUS sensors converging toward the set temperature is acceptable.
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <strong className="text-white block">TUS Modification Offsets (§ 3.2.6.1.4 & Tables 15 / 16):</strong>
                    Controlling instrument modification offsets for TUS shall not exceed the allowances in <strong className="text-cyan-300">Table 15 or Table 16</strong>, and are only permitted on the control sensor channel (§ 3.2.6.1.5).
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PHASE 4: INTERPRETING RESULTS & USING THIS APP */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-purple-950 border border-purple-700 rounded-lg text-purple-300 font-bold font-mono text-xs">
                  PHASE 4
                </span>
                <h3 className="text-sm font-bold text-white">
                  Interpreting Results, Handling Failed Sensors & Generating Your Report (§ 3.5.13 – § 3.5.16, pp. 50–54)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('nadcap')}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Go to Step 7: Audit & Export</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-purple-300">How the App Calculates Corrected Temperature (§ 2.4.16 & § 3.5.14.1.1):</div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
                  Corrected Temp = Raw Reading + TC Wire Correction + Recorder Correction
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300 pt-1">
                  <li>
                    <strong className="text-white">Sign Convention (§ 2.4.16 & § 2.4.18):</strong> <span className="font-mono text-white">Deviation/Error = Indicated − True</span>, and <span className="font-mono text-white">Correction Factor = −Error</span>. Correction factors of the TUS sensor and TUS instrument are added algebraically to obtain true temperature.
                  </li>
                  <li>
                    <strong className="text-white">Automatic CSV Import:</strong> In <strong className="text-white">Step 6</strong>, click <strong className="text-emerald-300">Import TUS CSV</strong> to automatically parse logger data, detect the ≥30-minute stabilized soak window, check for overshoot, and populate all channels.
                  </li>
                  <li>
                    <strong className="text-white">Save & Load Single-File Backups:</strong> Use <strong className="text-cyan-300">Save Settings</strong> and <strong className="text-amber-300">Load Settings</strong> in the top header to save or reload your entire survey setup and presets as a local <span className="font-mono">.json</span> file.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-red-400">What If the Furnace Fails the TUS? (§ 3.5.14.1.7, § 3.5.14.1.8 & § 4.4 – § 4.8):</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Remove Equipment from Service (§ 4.4):</strong> Any equipment failing a TUS (or exceeding its due date + Table 22 extension days) shall be removed from production immediately until corrective action is taken and a conforming TUS is completed (§ 4.7).
                  </li>
                  <li>
                    <strong className="text-white">Revert to Normal Periodic TUS Interval (§ 3.5.14.1.8):</strong> If the furnace was on an extended TUS interval, a TUS failure immediately reverts the furnace to the <strong className="text-amber-300">Normal Periodic TUS Interval</strong> in Table 15 or Table 16 until the required number of consecutive successful periodic TUSs are completed again.
                  </li>
                  <li>
                    <strong className="text-white">Evaluate Impact on Product (§ 4.5 & § 4.8):</strong> Perform and document an evaluation of possible effects on parts or raw material processed since the last successful TUS, and notify affected purchasers if processing conditions deviated from specification.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AMS 2750 REV H REFERENCE TABLES */}
      {activeGuideTab === 'tables' && (
        <div className="space-y-6 text-xs text-slate-300">
          {/* Table 15 & Table 16: TUS Frequency */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  AMS 2750 Rev H Table 15 (Parts, p. 39), Table 16 (Raw Material, p. 40) & Table 22 (Extensions, p. 56)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Per § 3.5.5.2: Extended periodic TUS intervals require completion of the listed number of <strong>consecutive successful periodic TUSs</strong> after the initial TUS, plus an active Preventive Maintenance (PM) program (§ 2.4.42).
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                TABLES 15, 16 & 22
              </span>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse table-auto text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-2">Furnace Class</th>
                    <th className="py-2 px-2">Instrument Type</th>
                    <th className="py-2 px-2 text-center">Consecutive TUS</th>
                    <th className="py-2 px-2 text-cyan-300">Table 15 (Parts): Normal ➔ Ext</th>
                    <th className="py-2 px-2 text-emerald-300">Table 16 (Raw Mat.): Normal ➔ Ext</th>
                    <th className="py-2 px-2 text-amber-300">Table 22 Grace Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">Class 1 & 2</td>
                    <td className="py-2 px-2 text-amber-300">Type D, D+</td>
                    <td className="py-2 px-2 text-center font-bold text-white">8</td>
                    <td className="py-2 px-2 text-cyan-300">Monthly ➔ Bimonthly</td>
                    <td className="py-2 px-2 text-emerald-300">Monthly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-slate-300">+3d (Mo/Bi) / +6d (Semi)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-2 font-bold text-white">Class 1 & 2</td>
                    <td className="py-2 px-2 text-amber-300">Type B, C</td>
                    <td className="py-2 px-2 text-center font-bold text-white">4</td>
                    <td className="py-2 px-2 text-cyan-300">Monthly ➔ Quarterly</td>
                    <td className="py-2 px-2 text-emerald-300">Quarterly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-slate-300">+3d (Mo) / +4d (Qtr) / +6d (Semi)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">Class 1 & 2</td>
                    <td className="py-2 px-2 text-amber-300">Type A</td>
                    <td className="py-2 px-2 text-center font-bold text-white">2</td>
                    <td className="py-2 px-2 text-cyan-300">Monthly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-emerald-300">Quarterly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-slate-300">+3d (Mo) / +4d (Qtr) / +6d (Semi)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-2 font-bold text-white">Class 3, 4 & 5</td>
                    <td className="py-2 px-2 text-amber-300">Type D, D+</td>
                    <td className="py-2 px-2 text-center font-bold text-white">4</td>
                    <td className="py-2 px-2 text-cyan-300">Quarterly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-emerald-300">Quarterly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-slate-300">+4d (Qtr) / +6d (Semi)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">Class 3, 4 & 5</td>
                    <td className="py-2 px-2 text-amber-300">Type B, C</td>
                    <td className="py-2 px-2 text-center font-bold text-white">3</td>
                    <td className="py-2 px-2 text-cyan-300">Quarterly ➔ Semiannually</td>
                    <td className="py-2 px-2 text-emerald-300">Semiannually ➔ Annually</td>
                    <td className="py-2 px-2 text-slate-300">+4d (Qtr) / +6d (Semi) / +12d (Ann)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-2 font-bold text-white">Class 3, 4 & 5</td>
                    <td className="py-2 px-2 text-amber-300">Type A</td>
                    <td className="py-2 px-2 text-center font-bold text-white">2</td>
                    <td className="py-2 px-2 text-cyan-300">Quarterly ➔ Annually</td>
                    <td className="py-2 px-2 text-emerald-300">Semiannually ➔ Annually</td>
                    <td className="py-2 px-2 text-slate-300">+4d (Qtr) / +6d (Semi) / +12d (Ann)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">Class 6</td>
                    <td className="py-2 px-2 text-amber-300">Type D, E</td>
                    <td className="py-2 px-2 text-center text-slate-400">None</td>
                    <td className="py-2 px-2 text-cyan-300">Annually ➔ Annually</td>
                    <td className="py-2 px-2 text-emerald-300">Annually ➔ Annually</td>
                    <td className="py-2 px-2 text-slate-300">+12d (Annually)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden grid grid-cols-1 gap-2.5 font-mono text-[11px]">
              {[
                { cls: 'Class 1 & 2', type: 'Type D, D+', req: '8', parts: 'Monthly ➔ Bimonthly', raw: 'Monthly ➔ Semiannually', grace: '+3d (Mo/Bi) / +6d (Semi)' },
                { cls: 'Class 1 & 2', type: 'Type B, C', req: '4', parts: 'Monthly ➔ Quarterly', raw: 'Quarterly ➔ Semiannually', grace: '+3d (Mo) / +4d (Qtr) / +6d (Semi)' },
                { cls: 'Class 1 & 2', type: 'Type A', req: '2', parts: 'Monthly ➔ Semiannually', raw: 'Quarterly ➔ Semiannually', grace: '+3d (Mo) / +4d (Qtr) / +6d (Semi)' },
                { cls: 'Class 3, 4 & 5', type: 'Type D, D+', req: '4', parts: 'Quarterly ➔ Semiannually', raw: 'Quarterly ➔ Semiannually', grace: '+4d (Qtr) / +6d (Semi)' },
                { cls: 'Class 3, 4 & 5', type: 'Type B, C', req: '3', parts: 'Quarterly ➔ Semiannually', raw: 'Semiannually ➔ Annually', grace: '+4d (Qtr) / +6d (Semi) / +12d (Ann)' },
                { cls: 'Class 3, 4 & 5', type: 'Type A', req: '2', parts: 'Quarterly ➔ Annually', raw: 'Semiannually ➔ Annually', grace: '+4d (Qtr) / +6d (Semi) / +12d (Ann)' },
                { cls: 'Class 6', type: 'Type D, E', req: 'None', parts: 'Annually ➔ Annually', raw: 'Annually ➔ Annually', grace: '+12d (Annually)' },
              ].map((row, i) => (
                <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-bold text-white">{row.cls} • <span className="text-amber-300">{row.type}</span></span>
                    <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                      Req Consecutive: <strong>{row.req}</strong>
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-slate-400">Parts (Table 15):</span><span className="text-cyan-300">{row.parts}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Raw Mat (Table 16):</span><span className="text-emerald-300">{row.raw}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Grace (Table 22):</span><span className="text-slate-300">{row.grace}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Table 17 & Table 18: Minimum Number of TUS Sensors */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  AMS 2750 Rev H Table 17 (p. 44) & Table 18 (p. 45) — Minimum Number of TUS Sensors (Volumetric Method)
                </h3>
                <p className="text-[11px] text-slate-400">
                  For volumes &lt; 3 ft³ (&lt; 0.085 m³), 5 sensors are required (4 alternating corners + 1 center per Figure 1), or the 9-sensor layout may be used per Table 17 Note 1. For volumes ≥ 225 ft³ (≥ 6.4 m³), Table 18 applies based on Furnace Class.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold self-start sm:self-center shrink-0">
                TABLES 17 & 18
              </span>
            </div>

            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse table-auto text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-1.5">QWZ Volume &lt;</th>
                    <th className="py-2 px-1.5">3 ft³<br/>(0.085m³)</th>
                    <th className="py-2 px-1.5">225 ft³<br/>(6.4m³)</th>
                    <th className="py-2 px-1.5">300 ft³<br/>(8.5m³)</th>
                    <th className="py-2 px-1.5">400 ft³<br/>(11m³)</th>
                    <th className="py-2 px-1.5">600 ft³<br/>(17m³)</th>
                    <th className="py-2 px-1.5">800 ft³<br/>(23m³)</th>
                    <th className="py-2 px-1.5">1000 ft³<br/>(28m³)</th>
                    <th className="py-2 px-1.5">2000 ft³<br/>(57m³)</th>
                    <th className="py-2 px-1.5">3000 ft³<br/>(85m³)</th>
                    <th className="py-2 px-1.5">4000 ft³<br/>(113m³)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-[11px]">
                  <tr>
                    <td className="py-2 px-1.5 font-bold text-cyan-300">Class 1 and 2</td>
                    <td className="py-2 px-1.5 font-bold text-white">5</td>
                    <td className="py-2 px-1.5 font-bold text-white">9</td>
                    <td className="py-2 px-1.5 text-cyan-300">14</td>
                    <td className="py-2 px-1.5 text-cyan-300">16</td>
                    <td className="py-2 px-1.5 text-cyan-300">19</td>
                    <td className="py-2 px-1.5 text-cyan-300">21</td>
                    <td className="py-2 px-1.5 text-cyan-300">23</td>
                    <td className="py-2 px-1.5 text-cyan-300">30</td>
                    <td className="py-2 px-1.5 text-cyan-300">35</td>
                    <td className="py-2 px-1.5 text-cyan-300">40</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-1.5 font-bold text-emerald-300">Class 3 to 6</td>
                    <td className="py-2 px-1.5 font-bold text-white">5</td>
                    <td className="py-2 px-1.5 font-bold text-white">9</td>
                    <td className="py-2 px-1.5 text-emerald-300">12</td>
                    <td className="py-2 px-1.5 text-emerald-300">13</td>
                    <td className="py-2 px-1.5 text-emerald-300">14</td>
                    <td className="py-2 px-1.5 text-emerald-300">15</td>
                    <td className="py-2 px-1.5 text-emerald-300">16</td>
                    <td className="py-2 px-1.5 text-emerald-300">20</td>
                    <td className="py-2 px-1.5 text-emerald-300">23</td>
                    <td className="py-2 px-1.5 text-emerald-300">25</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Grid for Table 17 & 18 */}
            <div className="md:hidden grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
              {[
                { vol: '< 3 ft³ (0.085m³)', c12: 5, c36: 5 },
                { vol: '< 225 ft³ (6.4m³)', c12: 9, c36: 9 },
                { vol: '< 300 ft³ (8.5m³)', c12: 14, c36: 12 },
                { vol: '< 400 ft³ (11m³)', c12: 16, c36: 13 },
                { vol: '< 600 ft³ (17m³)', c12: 19, c36: 14 },
                { vol: '< 800 ft³ (23m³)', c12: 21, c36: 15 },
                { vol: '< 1000 ft³ (28m³)', c12: 23, c36: 16 },
                { vol: '< 2000 ft³ (57m³)', c12: 30, c36: 20 },
                { vol: '< 3000 ft³ (85m³)', c12: 35, c36: 23 },
                { vol: '< 4000 ft³ (113m³)', c12: 40, c36: 25 },
              ].map((b, i) => (
                <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-1">{b.vol}</div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Class 1–2:</span>
                    <strong className="text-white">{b.c12}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">Class 3–6:</span>
                    <strong className="text-white">{b.c36}</strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              • <strong className="text-white">Table 18 Formula for Volumes &gt; 4000 ft³ (113 m³):</strong> Class 1 & 2 = <span className="text-cyan-300">9 + 1/2 × √(Volume_ft³ − 225)</span> | Class 3 to 6 = <span className="text-emerald-300">9 + 1/4 × √(Volume_ft³ − 225)</span>
            </div>
          </div>

          {/* Table 8, 15, 16 Tolerances & Offsets + Table 20 & 21 Sensor Failures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                Tables 8, 15 & 16 — Class Uniformity Tolerances & Max Permitted Offset
              </h3>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-2.5">Class</th>
                    <th className="py-2 px-2.5 text-cyan-300">TUS Tolerance (Table 8)</th>
                    <th className="py-2 px-2.5 text-amber-300">Max Offset (°F / °C)</th>
                    <th className="py-2 px-2.5 text-emerald-300">Max Offset (% Max Temp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-[11px]">
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 1</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±5.0°F (±3.0°C)</td>
                    <td className="py-1.5 px-2.5">±2.5°F (±1.5°C)</td>
                    <td className="py-1.5 px-2.5 text-slate-500">N/A</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 2</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±10.0°F (±6.0°C)</td>
                    <td className="py-1.5 px-2.5 text-amber-300">±5.0°F (±3.0°C)</td>
                    <td className="py-1.5 px-2.5 text-slate-500">N/A</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 3</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±15.0°F (±8.0°C)</td>
                    <td className="py-1.5 px-2.5 text-amber-300">±8.0°F (±5.0°C)</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">0.38%</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 4</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±20.0°F (±10.0°C)</td>
                    <td className="py-1.5 px-2.5">±10.0°F (±6.0°C)</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">0.38%</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 5</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±25.0°F (±14.0°C)</td>
                    <td className="py-1.5 px-2.5">±13.0°F (±7.0°C)</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">0.38%</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 6</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±50.0°F (±28.0°C)</td>
                    <td className="py-1.5 px-2.5 text-slate-500">N/A</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">0.75%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                Tables 20 & 21 (p. 50) — Allowable Number of TUS Sensor Failures (§ 3.5.13)
              </h3>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-2.5">Total TUS Sensors</th>
                    <th className="py-2 px-2.5 text-cyan-300">Table 20 (&lt;2000°F / &lt;1093°C)</th>
                    <th className="py-2 px-2.5 text-amber-300">Table 21 (≥2000°F / ≥1093°C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-[11px]">
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">3 to 5 Sensors</td>
                    <td className="py-1.5 px-2.5 text-red-300">None (0)</td>
                    <td className="py-1.5 px-2.5 text-red-300">None (0)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">6 to 9 Sensors</td>
                    <td className="py-1.5 px-2.5 text-red-300">None (0)</td>
                    <td className="py-1.5 px-2.5 text-amber-300">1</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">10 to 16 Sensors</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">1</td>
                    <td className="py-1.5 px-2.5 text-amber-300">2</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">17 to 23 Sensors</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">2</td>
                    <td className="py-1.5 px-2.5 text-amber-300">3</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">24 to 39 Sensors</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">3</td>
                    <td className="py-1.5 px-2.5 text-amber-300">4</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">≥ 40 Sensors</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">No more than 10%</td>
                    <td className="py-1.5 px-2.5 text-amber-300">No more than 10%</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[10px] text-slate-400">
                • Per <strong>§ 3.5.13.1 & § 3.5.13.2</strong>: Failure of <strong>any corner TUS sensor</strong> or <strong>any two adjacent TUS sensors</strong> is strictly prohibited regardless of total sensor count!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PASS/FAIL RULES & OPERATOR Q&A */}
      {activeGuideTab === 'faq' && (
        <div className="space-y-4 text-xs text-slate-300">
          {/* Q1: Out of Tolerance vs Failed (Broken) Sensor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Q1: What is the difference between an "Out-of-Tolerance" sensor and a "Failed (Open/Broken)" sensor?</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-red-950/25 border border-red-800/60 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-red-300">1. Working Sensor Reads Out of Tolerance = AUTOMATIC TUS FAIL</div>
                <p className="text-slate-300 leading-relaxed">
                  Per <strong className="text-white">AMS 2750 Rev H § 3.5.14.1.2 & § 3.5.14.1.5</strong>, if a sensor is functioning and measures a real furnace temperature outside the class tolerance (for example, <span className="font-mono text-white">507.5°C</span> in a Class 2 ±6°C survey at 500°C), <strong className="text-red-300">even a single sensor out of tolerance fails the entire TUS</strong>. You cannot ignore a hot or cold spot inside the work zone!
                </p>
              </div>
              <div className="bg-emerald-950/25 border border-emerald-800/60 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-emerald-300">2. Broken / Open-Circuit TUS Sensor = ALLOWED WITHIN § 3.5.13 & TABLE 20 / 21 LIMITS</div>
                <p className="text-slate-300 leading-relaxed">
                  Per <strong className="text-white">AMS 2750 Rev H § 3.5.13, Table 20 & Table 21 (p. 50)</strong>, a "failed sensor" means a TUS thermocouple that physically breaks or opens circuit during the test. Toggle any broken sensor to <strong className="text-amber-300">Failed (Open)</strong> in <strong className="text-white">Step 5</strong> or <strong className="text-white">Step 6</strong>, and the survey will still <strong className="text-emerald-300">PASS</strong> if all rules below are met:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Rule A (§ 3.5.13.1):</strong> The failed sensor is <strong>NOT at a corner location</strong> of a rectangular/square work zone (or periphery of a cylindrical work zone).</li>
                  <li><strong>Rule B (§ 3.5.13.2):</strong> No <strong>two adjacent TUS sensors</strong> have failed.</li>
                  <li><strong>Rule C (Table 20 / Table 21):</strong> Total failed sensors do not exceed the Table 20 limit (&lt;2000°F / &lt;1093°C: <strong>0</strong> for 3–9 TCs, <strong>1</strong> for 10–16 TCs, <strong>2</strong> for 17–23 TCs, <strong>3</strong> for 24–39 TCs, <strong>≤10%</strong> for ≥40 TCs) or Table 21 limit (≥2000°F / ≥1093°C).</li>
                  <li><strong>Rule D (§ 3.5.13.1):</strong> No permanent furnace control or recording channel failed.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Q2: 36 TCs Example */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">
              Q2: Example — How many sensors can fail in a Class 2 furnace using 36 TUS thermocouples?
            </h3>
            <p className="leading-relaxed text-slate-300">
              Under <strong className="text-cyan-300">AMS 2750 Rev H § 3.5.13, Table 20 & Table 21 (p. 50)</strong>, for a survey with <strong>36 TUS sensors</strong> (the <strong>24 to 39 sensors</strong> row):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong className="text-white">For surveys &lt; 2000°F (&lt; 1093°C) — Table 20:</strong> Up to <strong className="text-emerald-300">3 TUS sensors</strong> may fail.
              </li>
              <li>
                <strong className="text-white">For surveys ≥ 2000°F (≥ 1093°C) — Table 21:</strong> Up to <strong className="text-amber-300">4 TUS sensors</strong> may fail.
              </li>
              <li>
                <strong className="text-white">Mandatory Location Restrictions (§ 3.5.13.1 & § 3.5.13.2):</strong> None of the failed TUS sensors may be at a <strong>corner location</strong> of the work zone, and no <strong>two adjacent TUS sensors</strong> may fail!
              </li>
            </ul>
          </div>

          {/* Q3: Where does the "8 Surveys" rule come from? */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">
              Q3: When are 8 consecutive successful periodic TUS surveys required?
            </h3>
            <p className="leading-relaxed text-slate-300">
              In <strong className="text-cyan-300">AMS 2750 Rev H Table 15 (p. 39) & Table 16 (p. 40)</strong>, the <strong className="text-white">8 consecutive successful periodic TUS</strong> requirement applies to <strong className="text-emerald-300">Class 1 and Class 2 furnaces with Type D or D+ instrumentation</strong> (extending from Monthly to Bimonthly for Parts in Table 15, or from Monthly to Semiannually for Raw Material in Table 16). For <strong>Type B or C instrumentation</strong> in Class 1 & 2, <strong>4 consecutive successful periodic TUSs</strong> are required; for <strong>Type A instrumentation</strong> in Class 1 & 2, <strong>2 consecutive successful periodic TUSs</strong> are required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
