import React from 'react';
import {
  BookOpen,
  Wrench,
  Box,
  Thermometer,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Compass,
  Download,
  Settings,
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
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-900/50 rounded-2xl p-6 shadow-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              AMS 2750 Rev H & Nadcap TUS Operating Manual
            </h1>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Step-by-step guidance on pyrometry compliance, instrument and furnace setup, survey execution, and report compilation according to SAE AMS 2750 Rev H and Nadcap AC7102/8 standards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('meta')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <span>Start New Survey</span> <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab('equipment')}
          className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-4 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <Wrench className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">Step 1</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Test Equipment & Calibration</h3>
          <p className="text-xs text-slate-400">Add loggers, sensors, and verify MPE & UKAS traceability.</p>
        </div>

        <div 
          onClick={() => onNavigateTab('visual')}
          className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/60 rounded-xl p-4 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <Box className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">Step 2</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Furnace & Work Zone</h3>
          <p className="text-xs text-slate-400">Define furnace class, chamber dimensions, and QWZ offsets.</p>
        </div>

        <div 
          onClick={() => onNavigateTab('survey')}
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <Thermometer className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Step 3</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Performing TUS</h3>
          <p className="text-xs text-slate-400">Import CSV datalogger runs, verify stabilization and soak.</p>
        </div>

        <div 
          onClick={() => onNavigateTab('nadcap')}
          className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/60 rounded-xl p-4 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">Step 4</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Compiling Report</h3>
          <p className="text-xs text-slate-400">Audit checklists, signoffs, and Word document export.</p>
        </div>
      </div>

      {/* Detailed Instruction Sections */}
      <div className="space-y-6 text-xs text-slate-300">
        {/* Section 1 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400 font-bold font-mono">01</div>
            <h2 className="text-base font-bold text-slate-100">Adding & Managing Test Equipment (Calibration Register)</h2>
          </div>
          <div className="space-y-3 leading-relaxed">
            <p>
              Per <strong className="text-slate-100">AMS 2750 Rev H § 3.2.1</strong>, all field test instruments, data acquisition systems (DAS), sensors, and secondary standards used for temperature uniformity surveys must be calibrated and traceable to national standards (UKAS, NIST, PTB) with maximum permissible error (MPE) limits strictly satisfied.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> How to Add Equipment:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Navigate to the <strong className="text-slate-300">Test Equipment & Cal</strong> tab.</li>
                  <li>Enter the manufacturer, recorder model, serial number, and asset tag.</li>
                  <li>Specify the calibration date and due date (ensuring validity throughout the survey cycle).</li>
                  <li>Enter the calibration lab accreditation (e.g. UKAS / ISO 17025) and traceability number.</li>
                  <li>Verify that the Maximum Permissible Error (MPE) meets Table 7 limits ({tempUnit === '°C' ? '±0.6°C' : '±1.0°F'}).</li>
                </ul>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saving & Sharing Presets:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Save your frequently used recorders as custom presets using the <strong className="text-slate-300">Save Preset</strong> button.</li>
                  <li>Presets can be renamed or deleted instantly.</li>
                  <li>Use the <strong className="text-slate-300">Export All Presets (.json)</strong> feature in the Metadata tab to share equipment standards across your engineering team.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 bg-blue-950 border border-blue-800 rounded-xl text-blue-400 font-bold font-mono">02</div>
            <h2 className="text-base font-bold text-slate-100">Adding & Configuring Furnaces (Dimensions & Architecture)</h2>
          </div>
          <div className="space-y-3 leading-relaxed">
            <p>
              Accurate furnace classification and Qualified Work Zone (QWZ) geometry are vital for determining the minimum number of sensors required and evaluating thermal uniformity limits.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Configuring Furnace Architecture:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Navigate to the <strong className="text-slate-300">Dimensions & Work Zone</strong> tab.</li>
                  <li>Select the Furnace Class (Class 1 through 6) and Instrumentation Type (A through E).</li>
                  <li>Input internal chamber length, width, and height in {dimUnit}.</li>
                  <li>Define Qualified Work Zone (QWZ) boundary offsets from chamber walls.</li>
                  <li>The app automatically calculates volume in m³ and ft³, establishing the minimum required sensor count per AMS 2750 Table 12/13.</li>
                </ul>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Chamber Presets & 360° Inspection:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Create, rename, or delete custom furnace architecture presets.</li>
                  <li>Use the 2D isometric technical schematic to inspect sensor placement and wire rigging.</li>
                  <li>Rotate the 360° view or zoom in/out to verify spatial orientation (including the clearly marked furnace front door).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400 font-bold font-mono">03</div>
            <h2 className="text-base font-bold text-slate-100">Step-by-Step Guide on Performing a TUS</h2>
          </div>
          <div className="space-y-3 leading-relaxed">
            <ol className="list-decimal pl-5 space-y-2.5 text-slate-300">
              <li>
                <strong className="text-white">Sensor Rigging & Placement:</strong> Rig certified thermocouples on the internal wire frame matching the QWZ dimensions. Ensure sensors are positioned at all 8 corners and center of the work zone.
              </li>
              <li>
                <strong className="text-white">Datalogger Connection & Logging Interval:</strong> Connect sensors to the calibrated field test instrument. Verify logging frequency is set to <strong className="text-cyan-300">≤ 120 seconds</strong> (AMS 2750 Rev H requirement).
              </li>
              <li>
                <strong className="text-white">Survey Execution & Stabilization:</strong> Heat furnace to the required test setpoint (e.g., Min, Mid, Max operating temperatures). Once sensors enter the allowable tolerance band (e.g. ±6°C for Class 2), initiate the 30-minute soak period.
              </li>
              <li>
                <strong className="text-white">Importing DatatoApp:</strong> Click <strong className="text-cyan-300">Import TUS CSV</strong> in the Survey Readings tab. Upload your datalogger CSV export. The app automatically detects soak dwells, logging intervals, and calculates maximum overshoot, min/max readings, and temperature spread.
              </li>
            </ol>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 bg-purple-950 border border-purple-800 rounded-xl text-purple-400 font-bold font-mono">04</div>
            <h2 className="text-base font-bold text-slate-100">Compiling & Exporting the Formal Report</h2>
          </div>
          <div className="space-y-3 leading-relaxed">
            <p>
              Once survey readings, metadata, and audit checklists are verified:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                Review the <strong className="text-white">Nadcap AC7102/8 Audit Checklist</strong> tab to ensure all compliance questions are verified.
              </li>
              <li>
                Fill in the formal signoff authorities in the <strong className="text-white">Report Details</strong> tab (Pyrometry Technician and Quality Assurance Manager).
              </li>
              <li>
                Click <strong className="text-white">Preview Report</strong> to inspect the complete pyrometry document, trend graphs, and 2D schematic snapshots.
              </li>
              <li>
                Click <strong className="text-white">Download Word Report (.docx)</strong> to generate a fully formatted, professional audit-ready document.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
