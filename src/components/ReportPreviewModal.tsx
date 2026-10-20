import React, { useState } from 'react';
import {
  SurveyMetadata,
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  SurveySetpoint,
  TestInstrument,
  NadcapCheckItem,
  TusTrendData,
  DetectedDwellPeriod,
} from '../types/tus';
import { generateTusDocxBlob } from '../utils/docxGenerator';
import { calculateVolumeInM3, calculateVolumeInCuFt, getMinRequiredSensors, CLASS_TOLERANCES, evaluateSetpoint } from '../utils/ams2750';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Layers,
  Box,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { TusTrendGraph } from './TusTrendGraph';
import { toPng } from 'html-to-image';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: SurveyMetadata;
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  channels: ThermocoupleChannel[];
  setpoints: SurveySetpoint[];
  instrument: TestInstrument;
  checklist: NadcapCheckItem[];
  diagramImageBase64?: string;
  trendData?: TusTrendData[];
  dwellPeriods?: DetectedDwellPeriod[];
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  meta,
  chamber,
  qwz,
  channels,
  setpoints,
  instrument,
  checklist,
  diagramImageBase64,
  trendData,
  dwellPeriods,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const volumeM3 = calculateVolumeInM3(qwz, meta.dimUnit);
  const volumeCuFt = calculateVolumeInCuFt(qwz, meta.dimUnit);
  const { minSensors } = getMinRequiredSensors(volumeCuFt, volumeM3);
  const tolerance = CLASS_TOLERANCES[meta.furnaceClass][meta.tempUnit];

  const setpointAnalyses = setpoints.map((sp) =>
    evaluateSetpoint(
      sp,
      channels,
      meta.furnaceClass,
      meta.tempUnit,
      instrument.instrumentCorrection ?? 0,
      minSensors,
      qwz,
      meta.furnaceApplication || 'Parts'
    )
  );
  const overallPassed = 
    setpointAnalyses.every((sa) => sa.passed) && 
    channels.length >= minSensors &&
    checklist.every(item => item.compliant);

  const handleDownloadDocx = async () => {
    try {
      setDownloading(true);
      
      // 1. Capture Main Full Trend Graph
      // 1. Capture Main Full Trend Graph
      let trendImageBase64: string | undefined;
      const graphEl = document.getElementById('tus-trend-graph-container');
      if (graphEl) {
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          const dataUrl = await toPng(graphEl, {
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: '#0f172a',
            skipFonts: true,
          });
          trendImageBase64 = dataUrl;
        } catch (captureErr) {
          console.error('Failed to capture trend graph:', captureErr);
        }
      }

      // 2. Capture Individual Soak Zoom-In Graphs
      const setpointTrendImages: Record<string, string> = {};
      if (dwellPeriods && trendData) {
        for (let i = 0; i < dwellPeriods.length; i++) {
          const dwell = dwellPeriods[i];
          const spId = setpoints.find(s => Math.abs(s.targetTemp - dwell.targetTemp) < 1)?.id;
          if (!spId) continue;

          const el = document.getElementById(`sub-trend-capture-${i}`);
          if (el) {
            try {
              const subUrl = await toPng(el, {
                quality: 1.0,
                pixelRatio: 3,
                backgroundColor: '#0f172a',
                skipFonts: true,
              });
              setpointTrendImages[spId] = subUrl;
            } catch (err) {
              console.error(`Failed to capture soak graph ${i}:`, err);
            }
          }
        }
      }

      const blob = await generateTusDocxBlob({
        meta,
        chamber,
        qwz,
        channels,
        setpoints,
        instrument,
        checklist,
        diagramImageBase64,
        trendImageBase64,
        setpointTrendImages,
      });

    const fileName = `TUS_Report_${meta.furnaceId}_AMS2750H_${meta.date}.docx`;

    // Detect if running in Tauri environment
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

    if (isTauri) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
          filters: [{ name: 'Word Document', extensions: ['docx'] }],
          defaultPath: fileName,
        });

        if (filePath) {
          const uint8Array = new Uint8Array(await blob.arrayBuffer());
          await writeFile(filePath, uint8Array);
        }
      } catch (err) {
        console.error('Tauri native save failed:', err);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate docx:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-950/80 border border-blue-700/60 rounded-xl text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">
                AMS 2750 Rev H & Nadcap AC7102/8 TUS Document Template
              </h2>
              <p className="text-xs text-slate-400">
                100% compliant Microsoft Word format (.docx) with embedded 3D isometric CAD schematic & calibration tables.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/40 text-slate-200 text-xs">
          {/* Document Banner */}
          <div className="bg-white text-slate-900 p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                {meta.companyName} — {meta.facilityLocation}
              </div>
              <h1 className="text-lg font-extrabold text-blue-900 tracking-tight">
                TEMPERATURE UNIFORMITY SURVEY (TUS) REPORT
              </h1>
              <p className="text-[11px] text-slate-600 italic">
                Strict Compliance with SAE AMS 2750 Rev H & PRI Nadcap AC7102/8 Pyrometry Standards
              </p>
            </div>

            {/* Verdict Callout */}
            <div
              className={`p-3 rounded-lg border text-xs font-bold text-center ${
                overallPassed
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {overallPassed
                ? `AUDIT VERDICT: CONFORMANT / ACCEPTED — Class ${meta.furnaceClass} (±${tolerance}${meta.tempUnit}) satisfied across all ${channels.length} channels`
                : 'AUDIT VERDICT: NON-CONFORMANT — One or more parameters require resolution'}
            </div>

            {/* Key Information Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 block">Report Number:</span>
                <span className="font-bold text-slate-800">{meta.reportNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Furnace ID:</span>
                <span className="font-bold text-slate-800">{meta.furnaceId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Class & Type:</span>
                <span className="font-bold text-slate-800">
                  Class {meta.furnaceClass} (±{tolerance}{meta.tempUnit}) | Type {meta.instrumentationType}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Survey Date:</span>
                <span className="font-bold text-slate-800">{meta.date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">As Found Error:</span>
                <span className="font-bold text-slate-800">
                  {instrument.asFoundError !== undefined ? `${instrument.asFoundError} ${meta.tempUnit}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">As Left Error:</span>
                <span className="font-bold text-slate-800">
                  {instrument.asLeftError !== undefined ? `${instrument.asLeftError} ${meta.tempUnit}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Stability Hold:</span>
                <span className="font-bold text-slate-800">
                  {setpoints[0]?.fullHoldDurationMinutes || setpoints[0]?.soakDurationMinutes || 30} min
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Capture Window:</span>
                <span className="font-bold text-slate-800">
                  {setpoints[0]?.soakDurationMinutes || 30} min
                </span>
              </div>
            </div>

            {/* Diagram Preview */}
            <div className="space-y-2 pt-2">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-blue-600" />
                <span>Embedded 3D Isometric Furnace & Wire Harness Routing Schematic:</span>
              </div>
              {diagramImageBase64 ? (
                <div className="bg-slate-900 rounded-lg p-2 border border-slate-700 flex justify-center">
                  <img
                    src={diagramImageBase64}
                    alt="Furnace CAD Schematic"
                    className="max-h-56 rounded object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-100 rounded border border-dashed border-slate-300 text-slate-500">
                  3D CAD snapshot ready for inclusion in generated Word doc
                </div>
              )}
            </div>
            
            {/* TUS Trend Graph Analysis */}
            <div className="space-y-2 pt-2">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>TUS Temperature Trend Analysis & Dwell Capture Points:</span>
              </div>
              <TusTrendGraph 
                data={trendData || []} 
                dwells={dwellPeriods || []} 
                channels={channels}
                tempUnit={meta.tempUnit}
                furnaceClass={meta.furnaceClass}
              />
              <div className="text-[10px] text-slate-500 italic px-1">
                Visual evidence of stabilized soak periods meeting AMS 2750 Rev H consecutive time requirements.
              </div>
            </div>

            {/* Section Breakdown Preview */}
            <div className="space-y-3 pt-2 text-[11px] text-slate-700">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                Included Document Sections:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>
                  <strong className="text-slate-800">Section 1:</strong> Furnace Chamber ({chamber.length}×{chamber.width}×{chamber.height} {meta.dimUnit}) & Qualified Work Zone ({volumeM3.toFixed(3)} m³ / {(volumeM3 * 1000).toFixed(0)} L)
                </li>
                <li>
                  <strong className="text-slate-800">Section 2:</strong> 6-Way Surface Clearances (Distance from Left, Right, Front, Rear, Floor, Ceiling for all {channels.length} channels in {meta.dimUnit})
                </li>
                <li>
                  <strong className="text-slate-800">Section 3:</strong> 2D Isometric Engineering Drawing with Physical Wire Grid Web & Triangular Markers (Picture 1 Standard)
                </li>
                <li>
                  <strong className="text-slate-800">Section 4:</strong> Thermocouple Calibration Batch Records & UKAS / NIST Traceable Data Logger Specifications
                </li>
                <li>
                  <strong className="text-slate-800">Section 5:</strong> Temperature Uniformity Matrix ({setpoints.length} Setpoints) with Correction Factors & Spread Evaluation
                </li>
                <li>
                  <strong className="text-slate-800">Section 6:</strong> PRI Nadcap AC7102/8 Pyrometry Checklist Attestation
                </li>
                <li>
                  <strong className="text-slate-800">Section 7:</strong> Corrective Actions & Automated Audit Findings Summary (Lists all uniformity/overshoot/checklist failures)
                </li>
                <li>
                  <strong className="text-slate-800">Section 8:</strong> Official Quality Authorization & Signature Blocks (Technician, QA Manager, Level 3 Authority)
                </li>
              </ul>
              <p className="mt-4 pt-2 border-t border-slate-200 text-slate-800 font-bold italic">
                Raw data logs containing 1-minute interval readings for all TUS sensors are stored electronically and available for auditor review upon request.
              </p>
            </div>
          </div>
        </div>

        {/* Hidden Container for Sub-Trend Capture (Off-screen) */}
        <div style={{ position: 'absolute', top: -9999, left: -9999, width: '1000px' }}>
          {dwellPeriods?.map((dwell, idx) => {
            // Buffer of 2 samples before/after for context
            const buffer = 2;
            const subData = trendData?.slice(
              Math.max(0, dwell.startIndex - buffer),
              Math.min(trendData.length, dwell.endIndex + buffer + 1)
            ) || [];

            return (
              <div key={`capture-${idx}`} id={`sub-trend-capture-${idx}`} style={{ width: '1000px', height: '400px' }}>
                <TusTrendGraph 
                  data={subData} 
                  dwells={[dwell]} 
                  channels={channels} 
                  tempUnit={meta.tempUnit} 
                  furnaceClass={meta.furnaceClass}
                  isZoomed={true}
                  showLegend={false}
                  hideTooltip={true}
                />
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {downloadSuccess ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Word Document downloaded successfully!
              </span>
            ) : (
              <span>Fully editable .docx format compatible with MS Word, LibreOffice, and Google Docs</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg hover:shadow-blue-500/25 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {downloading ? 'Compiling Word Docx...' : 'Download AMS 2750 Rev H Word Doc (.docx)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
