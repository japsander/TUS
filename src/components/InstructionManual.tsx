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
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveGuideTab('operator-guide')}
          className={`flex-1 min-w-[180px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'operator-guide'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>1. Step-by-Step Operator Guide</span>
        </button>
        <button
          onClick={() => setActiveGuideTab('tables')}
          className={`flex-1 min-w-[180px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'tables'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. AMS 2750 Rev H Reference Tables</span>
        </button>
        <button
          onClick={() => setActiveGuideTab('faq')}
          className={`flex-1 min-w-[180px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'faq'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
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
                  Pre-Survey Checks: Furnace Class, Setpoints & Test Equipment (AMS 2750H § 3.2, § 3.5.3, § 3.5.6)
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
                    <strong className="text-white">Furnace Class (Table 13 / Table 14):</strong> Sets your allowed temperature tolerance:
                    <br />
                    <span className="font-mono text-[11px] text-slate-400">
                      Class 1: ±5°F (±3°C) | Class 2: ±10°F (±6°C) | Class 3: ±15°F (±8°C) | Class 4: ±20°F (±10°C) | Class 5: ±25°F (±14°C) | Class 6: ±50°F (±28°C)
                    </span>
                  </li>
                  <li>
                    <strong className="text-white">Instrumentation Type (Table 9):</strong> Select <span className="font-mono text-amber-300">Type A, B, C, D+, D, or E</span> based on what sensors and recorders are permanently installed on the furnace.
                  </li>
                  <li>
                    <strong className="text-white">Application Category:</strong> Choose <strong className="text-emerald-300">Parts (Table 15)</strong> or <strong className="text-emerald-300">Raw Material (Table 16)</strong>. This determines how many consecutive passing surveys you need before extending your TUS interval, and sets the maximum allowed controller offset in Table 18.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">2. Choose Survey Temperatures (§ 3.5.3 & § 3.5.6)</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Min & Max Operating Temperatures:</strong> You must test the lowest and highest temperatures of each qualified operating range.
                  </li>
                  <li>
                    <strong className="text-white">Maximum Step Rule (§ 3.5.6.1):</strong> If the span between your lowest and highest temperature is greater than <strong className="text-amber-300">600°F (335°C)</strong>, you <strong>must</strong> add intermediate test temperature(s) so that no two consecutive survey temperatures are more than <strong className="text-amber-300">600°F (335°C)</strong> apart.
                  </li>
                  <li>
                    <em>Example:</em> If your range is <span className="font-mono text-white">300°C to 1050°C</span> (a 750°C span), you cannot only test 300°C and 1050°C. You must add an intermediate setpoint (such as <span className="font-mono text-white">635°C</span>) so each step is ≤ 335°C.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">3. Verify Field Test Recorder Calibration (Table 7)</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    Check the calibration sticker on your portable TUS data logger / recorder. It must be within its valid calibration due date (max 12 months per <strong className="text-white">Table 7</strong>).
                  </li>
                  <li>
                    <strong className="text-white">Maximum Permissible Error (MPE):</strong> Must be within <strong className="text-emerald-300">±1.1°F or ±0.6°C</strong> (or 0.1% of reading) per AMS 2750 Rev H Table 7.
                  </li>
                  <li>
                    Enter the recorder's Serial Number, Calibration Date, Due Date, and UKAS/NIST Certificate Number in <strong className="text-white">Step 3 (Metrology Traceability)</strong>.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-300">4. Verify TUS Thermocouple Wire & Usage Limits (Table 1 & Table 2)</div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    Every TUS thermocouple roll/spool must have a valid calibration certificate showing its correction factors at the survey temperatures.
                  </li>
                  <li>
                    <strong className="text-white">Base Metal TUS Wire Limits (Table 2 & § 3.1.5.2):</strong>
                    <br />
                    • <strong className="text-amber-300">Type K or E used above 1000°F (540°C):</strong> <span className="underline text-white">ONE USE ONLY</span> during a TUS!
                    <br />
                    • <strong className="text-emerald-300">Type J, M, N, T (any temp) or Type K, E at/below 1000°F (540°C):</strong> Up to <strong className="text-white">90 uses</strong> or <strong className="text-white">180 days</strong> cumulative exposure at temperature (or 30 uses / 90 days above 1800°F / 980°C).
                  </li>
                  <li>
                    <strong className="text-white">Damaged Wire (§ 3.1.10.2):</strong> Never cut and re-weld a used thermocouple unless the shortened wire has been re-calibrated or proven unaffected.
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
                  Setting Up the Furnace & Rigging TUS Sensors (AMS 2750H § 3.5.5, § 3.5.9, § 3.5.10, Table 17)
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
                  <div className="font-bold text-blue-300">1. How Many Sensors Do I Need? (Table 17)</div>
                  <p className="text-slate-300 leading-relaxed">
                    Measure the <strong className="text-white">Qualified Work Zone (QWZ)</strong> length, width, and height in <strong className="text-white">Step 4</strong>. The app calculates the volume and applies <strong className="text-cyan-300">AMS 2750 Rev H Table 17</strong>:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[11px]">
                    <li>&lt; 225 ft³ (&lt; 6.4 m³): <strong className="text-white">9 sensors min</strong></li>
                    <li>225 – 3,000 ft³ (6.4 – 85 m³): <strong className="text-white">9 + 1 per 100 ft³ (2.83 m³)</strong> excess or fraction thereof</li>
                    <li>&gt; 3,000 ft³ (&gt; 85 m³): <strong className="text-white">37 + 1 per 250 ft³ (7.08 m³)</strong> excess or fraction thereof</li>
                  </ul>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-blue-300">2. Where Do I Place the Sensors? (§ 3.5.10.3.1)</div>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                    <li>
                      <strong className="text-white">Rectangular Work Zones:</strong> Place <strong className="text-white">8 sensors at the 8 outer corners</strong> of the Qualified Work Zone and <strong className="text-white">1 sensor at the geometric center</strong>. Any additional sensors must be distributed uniformly to represent the work zone.
                    </li>
                    <li>
                      <strong className="text-white">Cylindrical Work Zones:</strong> Place <strong className="text-white">6 sensors on the outer periphery</strong> (3 at the top plane 120° apart, 3 at the bottom plane 120° apart) and <strong className="text-white">3 sensors along the center vertical axis</strong> (top, middle, bottom).
                    </li>
                    <li>
                      <strong className="text-white">Radiation Heat Transfer (§ 3.5.10.3.1.c):</strong> In vacuum or radiation-dominated furnaces, corner TUS sensors must be no more than <strong className="text-amber-300">3 inches (76 mm)</strong> inside the corners of the work zone.
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-blue-300">3. Furnace Setup & Load Rules (§ 3.5.5 & § 3.5.9)</div>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                    <li>
                      <strong className="text-white">Load Condition (§ 3.5.5.2):</strong> Once an Initial TUS is run with a load, rack, or empty, all subsequent Periodic TUS runs must use that <strong className="text-white">same condition</strong>.
                    </li>
                    <li>
                      <strong className="text-white">Probe Tip Exposure (§ 3.5.10.1):</strong> Keep TUS thermocouple tips exposed to the furnace environment (do not bury them inside thick heat sinks unless simulating load thickness ≤ 0.5 in / 13 mm).
                    </li>
                    <li>
                      <strong className="text-white">Atmosphere, Fans & Baffles (§ 3.5.9):</strong> Set circulation fans, dampers, baffles, and atmosphere/vacuum levels to exactly match normal production settings.
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
                  Running the Survey: Logging, Stabilization, Overshoot & 30-Minute Soak (AMS 2750H § 3.5.10)
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
                <div className="font-bold text-emerald-300">Step-by-Step Execution at the Furnace:</div>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>
                    <strong className="text-white">Set Data Logger Interval ≤ 2 Minutes (§ 3.5.10.7):</strong> Set your portable TUS recorder to log all channels at least once every <strong className="text-cyan-300">120 seconds (2 minutes)</strong> or faster (e.g. 30s or 60s).
                  </li>
                  <li>
                    <strong className="text-white">Start Recording Before Reaching Tolerance (§ 3.5.10.4):</strong> Begin logging data <em>before</em> the first furnace or TUS sensor enters the lower tolerance band so that recovery and any temperature overshoot are captured.
                  </li>
                  <li>
                    <strong className="text-white">Wait for All Sensors to Enter Tolerance Band:</strong> Watch the corrected temperatures. The soak timer <strong className="text-amber-300">cannot start</strong> until <em>every active TUS sensor and permanent furnace zone sensor</em> is inside the tolerance band <span className="font-mono text-white">[Target − Tol, Target + Tol]</span>.
                  </li>
                  <li>
                    <strong className="text-white">Hold for at Least 30 Additional Minutes (§ 3.5.10.9):</strong> Once temperatures have stabilized inside the tolerance band, continue recording for a <strong className="text-emerald-300">minimum of 30 consecutive minutes</strong>. (If testing with a load where temperatures don't level off, record until the hottest and coldest TUS sensors both pass the target temperature).
                  </li>
                  <li>
                    <strong className="text-white">Step Up to Next Setpoint (§ 3.5.6):</strong> For multi-temperature surveys, always step from lowest to highest temperature (unless forced cooling is part of production). Repeat the stabilization and ≥30-minute soak at each setpoint.
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Critical Rules During the Run (Don't Fail an Audit!):</span>
                </div>
                <div className="space-y-2.5 text-slate-300">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <strong className="text-white block">Zero Overshoot Above Upper Tolerance (§ 3.5.10.6 & § 3.5.14.1.2):</strong>
                    At <strong>no time</strong> during heat-up, recovery, stabilization, or the 30-minute soak may any TUS sensor or furnace sensor exceed the upper TUS tolerance (<span className="font-mono text-amber-300">Target + Class Tolerance</span>). Even a 1-minute spike above the upper tolerance during approach is an automatic <strong className="text-red-400">TUS FAIL</strong> unless you wait for the furnace to re-stabilize without overshoot.
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <strong className="text-white block">Furnace Control & Recording Sensors Must Also Pass (§ 3.5.13.3.i & § 3.5.14.1.1):</strong>
                    Every permanent furnace control sensor and recording sensor must also read within the TUS tolerance band during the 30-minute soak. Record the controller reading in <strong className="text-white">Step 6</strong>.
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <strong className="text-white block">Adjusting Controller Offset During a TUS (§ 3.5.8 & Table 18):</strong>
                    If you adjust the furnace controller offset during a TUS to center the temperatures, the magnitude of the offset cannot exceed <strong className="text-cyan-300">Table 18</strong> limits, and you must restart the stabilization and 30-minute soak after making the adjustment.
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
                  Interpreting Results, Handling Failed Sensors & Generating Your Report (§ 3.5.14 & § 3.5.15)
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
                <div className="font-bold text-purple-300">How the App Calculates Corrected Temperature (§ 3.5.14.1):</div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
                  Corrected Temp = Raw Reading + TC Wire Correction + Recorder Correction
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300 pt-1">
                  <li>
                    <strong className="text-white">Sign Convention:</strong> Under AMS 2750 Rev H § 3.2.8.d, <span className="font-mono text-white">Correction = −Error</span>. Always check your calibration certificate to verify whether the number listed is an Error or a Correction Factor before entering its sign (+ or −).
                  </li>
                  <li>
                    <strong className="text-white">Automatic CSV Import:</strong> In <strong className="text-white">Step 6</strong>, click <strong className="text-emerald-300">Import TUS CSV</strong>. The app maps your logger columns to TC numbers, scans the entire run for ≥30-minute compliant dwells, checks for overshoot, and populates all readings automatically.
                  </li>
                  <li>
                    <strong className="text-white">Save & Load Single-File Backups:</strong> Use <strong className="text-cyan-300">Save Settings</strong> and <strong className="text-amber-300">Load Settings</strong> in the top header to save or reload your entire survey setup, presets, and readings as a local <span className="font-mono">.json</span> file anytime.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-red-400">What If the Furnace Fails the TUS? (§ 3.5.2.1 & § 3.5.12):</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-white">Remove Furnace from Service Immediately (§ 3.5.2.1):</strong> If any active sensor reads outside the class tolerance (or overshoots the upper limit), the furnace <strong className="text-red-400">FAILS</strong> and must be tagged out of production until the cause is corrected and a re-survey passes.
                  </li>
                  <li>
                    <strong className="text-white">Revert to Initial TUS Frequency (Table 15 / 16):</strong> Any TUS failure (or out-of-tolerance offset adjustment) immediately resets your furnace back to the <strong className="text-amber-300">Initial Periodic Frequency</strong> (e.g. Monthly for Class 1–2, Quarterly for Class 3–5). You must complete the required consecutive passing periodic surveys again to earn back Reduced Frequency.
                  </li>
                  <li>
                    <strong className="text-white">Quality Impact Review (§ 3.6):</strong> Notify Quality Assurance to evaluate whether parts processed since the last successful TUS were affected.
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
                  AMS 2750 Rev H Table 15 (Parts) & Table 16 (Raw Material) — TUS Frequency & Reduced Intervals
                </h3>
                <p className="text-[11px] text-slate-400">
                  Important Note (Footnote 2 of Tables 15 & 16): The Initial TUS <strong>does NOT count</strong> toward the required number of consecutive successful periodic surveys!
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                TABLES 15, 16 & 20
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px] text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Furnace Class</th>
                    <th className="py-2.5 px-3">Instrumentation Type</th>
                    <th className="py-2.5 px-3">Initial TUS Interval</th>
                    <th className="py-2.5 px-3 text-cyan-300">Table 15 (Parts) Reduced Interval</th>
                    <th className="py-2.5 px-3 text-emerald-300">Table 16 (Raw Material) Reduced Interval</th>
                    <th className="py-2.5 px-3 text-amber-300">Table 20 Max Grace Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                  <tr>
                    <td className="py-2 px-3 font-bold text-white">Class 1 & 2</td>
                    <td className="py-2 px-3 text-amber-300">Type A</td>
                    <td className="py-2 px-3">Monthly</td>
                    <td className="py-2 px-3 text-cyan-300">Semi-annually (after 3 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Semi-annually (after 2 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+4d (Mo) / +14d (Semi)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-3 font-bold text-white">Class 1 & 2</td>
                    <td className="py-2 px-3 text-amber-300">Type B or C</td>
                    <td className="py-2 px-3">Monthly</td>
                    <td className="py-2 px-3 text-cyan-300">Quarterly (after 4 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Quarterly (after 3 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+4d (Mo) / +7d (Qtr)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-white">Class 1 & 2</td>
                    <td className="py-2 px-3 text-amber-300">Type D+ or D</td>
                    <td className="py-2 px-3">Monthly</td>
                    <td className="py-2 px-3 text-cyan-300">Quarterly (after 4 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Bimonthly (after 8 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+4d (Mo) / +7d (Bi/Qtr)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-3 font-bold text-white">Class 3, 4 & 5</td>
                    <td className="py-2 px-3 text-amber-300">Type A</td>
                    <td className="py-2 px-3">Quarterly</td>
                    <td className="py-2 px-3 text-cyan-300">Annually (after 2 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Annually (after 2 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+7d (Qtr) / +14d (Ann)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-white">Class 3, 4 & 5</td>
                    <td className="py-2 px-3 text-amber-300">Type B or C</td>
                    <td className="py-2 px-3">Quarterly</td>
                    <td className="py-2 px-3 text-cyan-300">Semi-annually (after 3 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Semi-annually (after 3 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+7d (Qtr) / +14d (Semi)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-3 font-bold text-white">Class 3, 4 & 5</td>
                    <td className="py-2 px-3 text-amber-300">Type D+ or D</td>
                    <td className="py-2 px-3">Quarterly</td>
                    <td className="py-2 px-3 text-cyan-300">Semi-annually (after 4 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Semi-annually (after 4 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+7d (Qtr) / +14d (Semi)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-white">Class 6</td>
                    <td className="py-2 px-3 text-amber-300">Type A, B, C, D+, D</td>
                    <td className="py-2 px-3">Semi-annually</td>
                    <td className="py-2 px-3 text-cyan-300">Annually (after 2 periodic passes)</td>
                    <td className="py-2 px-3 text-emerald-300">Annually (after 2 periodic passes)</td>
                    <td className="py-2 px-3 text-slate-300">+14d (Semi / Annually)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-3 font-bold text-white">Class 6</td>
                    <td className="py-2 px-3 text-amber-300">Type E</td>
                    <td className="py-2 px-3">Annually</td>
                    <td className="py-2 px-3 text-slate-500">Not Applicable (Remains Annually)</td>
                    <td className="py-2 px-3 text-slate-500">Not Applicable (Remains Annually)</td>
                    <td className="py-2 px-3 text-slate-300">+14d (Annually)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 13/14 Tolerances & Table 18 Max Offset */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                Tables 13, 14 & 18 — Class Uniformity Tolerances & Max Allowed Offset
              </h3>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-2.5">Class</th>
                    <th className="py-2 px-2.5 text-cyan-300">TUS Tolerance</th>
                    <th className="py-2 px-2.5 text-amber-300">Max Offset (Parts)</th>
                    <th className="py-2 px-2.5 text-emerald-300">Max Offset (Raw Mat.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-[11px]">
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 1</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±5°F (±3°C)</td>
                    <td className="py-1.5 px-2.5">±5°F (±3°C)</td>
                    <td className="py-1.5 px-2.5">±5°F (±3°C)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 2</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±10°F (±6°C)</td>
                    <td className="py-1.5 px-2.5 text-amber-300">±10°F (±6°C)</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">±5°F (±3°C)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 3</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±15°F (±8°C)</td>
                    <td className="py-1.5 px-2.5 text-amber-300">±10°F (±6°C)</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">±8°F (±4°C)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 4</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±20°F (±10°C)</td>
                    <td className="py-1.5 px-2.5">±10°F (±6°C)</td>
                    <td className="py-1.5 px-2.5">±10°F (±6°C)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 5</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±25°F (±14°C)</td>
                    <td className="py-1.5 px-2.5">±13°F (±7°C)</td>
                    <td className="py-1.5 px-2.5">±13°F (±7°C)</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-1.5 px-2.5 font-bold text-white">Class 6</td>
                    <td className="py-1.5 px-2.5 text-cyan-300">±50°F (±28°C)</td>
                    <td className="py-1.5 px-2.5">±25°F (±14°C)</td>
                    <td className="py-1.5 px-2.5">±25°F (±14°C)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                Table 9 — Furnace Instrumentation Types (A through E)
              </h3>
              <ul className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-amber-300 font-mono">Type A:</strong> Control sensor + High & Low limit sensors + Recording sensors representing the hottest and coldest locations determined by the latest TUS.
                </li>
                <li>
                  <strong className="text-amber-300 font-mono">Type B:</strong> Control sensor + Overtemperature sensor + Recording sensor(s) representing the hottest and coldest locations determined by the latest TUS.
                </li>
                <li>
                  <strong className="text-amber-300 font-mono">Type C:</strong> Control sensor + Recording sensors representing the hottest and coldest locations determined by the latest TUS (no overtemperature unit required).
                </li>
                <li>
                  <strong className="text-amber-300 font-mono">Type D+:</strong> Control sensor + Overtemperature sensor + at least one extra recording sensor per control zone.
                </li>
                <li>
                  <strong className="text-amber-300 font-mono">Type D:</strong> Control sensor + Overtemperature sensor per control zone.
                </li>
                <li>
                  <strong className="text-amber-300 font-mono">Type E:</strong> Minimum of one control/indicating sensor per control zone (Restricted to <strong className="text-white">Class 6 furnaces only</strong>).
                </li>
              </ul>
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
                  Per <strong className="text-white">AMS 2750 Rev H § 3.5.14.1.1 & § 3.5.14.1.2</strong>, if a sensor is functioning and measures a real furnace temperature outside the class tolerance (for example, <span className="font-mono text-white">507.5°C</span> in a Class 2 ±6°C survey at 500°C), <strong className="text-red-300">even a single sensor out of tolerance fails the entire TUS</strong>. You cannot ignore a hot or cold spot inside the work zone!
                </p>
              </div>
              <div className="bg-emerald-950/25 border border-emerald-800/60 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-emerald-300">2. Broken / Open-Circuit TUS Sensor = ALLOWED WITHIN § 3.5.10.2 LIMITS</div>
                <p className="text-slate-300 leading-relaxed">
                  Per <strong className="text-white">AMS 2750 Rev H § 3.5.10.2 & § 3.5.14.1.6</strong>, a "failed sensor" means a TUS thermocouple that physically breaks, opens circuit, or loses connection during the test. You can toggle any broken sensor to <strong className="text-amber-300">Failed (Open)</strong> in <strong className="text-white">Step 5 (Sensor Layout)</strong> or <strong className="text-white">Step 6 (Survey Data)</strong>, and the survey will still <strong className="text-emerald-300">PASS</strong> if all 4 rules below are met:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Rule A:</strong> If 9 TUS sensors are used, at most <strong>1 sensor</strong> may fail. If &gt;9 TUS sensors are used, at most <strong>10%</strong> of total TUS sensors may fail.</li>
                  <li><strong>Rule B:</strong> Remaining active TUS sensors must still meet or exceed the <strong>Table 17 minimum count</strong> for your work zone volume (when &gt;9 sensors are used).</li>
                  <li><strong>Rule C:</strong> Failed sensors are <strong>not in adjacent corners</strong> of the work zone.</li>
                  <li><strong>Rule D:</strong> No permanent furnace control or recording sensor failed (§ 3.5.14.1.6).</li>
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
              Under <strong className="text-cyan-300">AMS 2750 Rev H § 3.5.10.2</strong>, when more than 9 TUS sensors are used, the number of failed (broken/open) TUS sensors cannot exceed <strong className="text-white">10% of the TUS sensors used</strong> AND cannot reduce the active sensors below the <strong className="text-white">Table 17 minimum</strong> for that work zone volume:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong className="text-white">10% Limit Calculation:</strong> 10% of 36 sensors = 3.6 → maximum <strong className="text-emerald-300">3 failed sensors allowed</strong> (leaving 33 active sensors), provided your work zone volume requires ≤ 33 sensors in Table 17, none of the failed sensors are in adjacent corners, and no permanent control/recording sensor failed.
              </li>
              <li>
                If your work zone volume is large enough that Table 17 requires 35 sensors, then only <strong className="text-amber-300">1 sensor</strong> (36 − 35 = 1) could fail. This app automatically checks both the 10% rule, the Table 17 volume minimum, and adjacent corners for you!
              </li>
            </ul>
          </div>

          {/* Q3: Where does the "8 Surveys" rule come from? */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">
              Q3: When are 8 consecutive successful periodic TUS surveys required?
            </h3>
            <p className="leading-relaxed text-slate-300">
              In <strong className="text-cyan-300">AMS 2750 Rev H</strong>, the <strong className="text-white">8 consecutive successful periodic TUS</strong> requirement applies specifically in <strong className="text-emerald-300">Table 16 (Raw Material Furnaces)</strong> for <strong className="text-white">Class 1 and Class 2 furnaces with Type D+ or Type D instrumentation</strong> to extend from Monthly to Bimonthly TUS frequency. For <strong className="text-cyan-300">Table 15 (Parts Heat Treating Furnaces)</strong>, Class 1 & 2 furnaces require <strong className="text-white">3 consecutive periodic passes</strong> (Type A) or <strong className="text-white">4 consecutive periodic passes</strong> (Types B, C, D+, D) to extend their TUS interval. You can switch between <strong>Parts (Table 15)</strong> and <strong>Raw Material (Table 16)</strong> in Step 2.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
