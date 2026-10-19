import React, { useState, useRef } from 'react';
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
  Printer,
  Scale,
  Users,
  Loader2,
} from 'lucide-react';
import { TusTrendGraph } from './TusTrendGraph';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  correctiveActions?: {
    rootCause: string;
    actionTaken: string;
    retestPlan: string;
    status: string;
  };
  onUpdateCorrectiveActions?: (actions: { rootCause: string; actionTaken: string; retestPlan: string; status: string }) => void;
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
  correctiveActions,
  onUpdateCorrectiveActions,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const volumeM3 = calculateVolumeInM3(qwz, meta.dimUnit);
  const volumeCuFt = calculateVolumeInCuFt(qwz, meta.dimUnit);
  const { minSensors } = getMinRequiredSensors(volumeCuFt, volumeM3);
  const tolerance = CLASS_TOLERANCES[meta.furnaceClass][meta.tempUnit];

  const setpointAnalyses = setpoints.map((sp) =>
    evaluateSetpoint(sp, channels, meta.furnaceClass, meta.tempUnit, instrument.instrumentCorrection ?? 0)
  );
  
  const overallPassed = 
    setpoints.length > 0 &&
    setpointAnalyses.every((sa) => sa.passed) && 
    channels.length >= minSensors &&
    checklist.every(item => item.compliant);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const element = reportRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Ensure the full height is captured even if it's scrollable
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`TUS_Report_${meta.furnaceId || 'Furnace'}_${meta.date}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to generate PDF. Using high-resolution capture might require more memory. Please use the "Print Report" button and select "Save as PDF".');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:bg-white print:p-0 print:block print:relative print:overflow-visible">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none print:overflow-visible">
        {/* Header Bar - Hidden in Print */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-950/80 border border-blue-700/60 rounded-xl text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">
                AMS 2750 Rev H & Nadcap AC7102/8 TUS Final Report Preview
              </h2>
              <p className="text-xs text-slate-400">
                Full technical report with all tables, trend graphs, and metrology traceability.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-slate-950/40 text-slate-200 text-xs print:p-0 print:overflow-visible print:bg-white print:text-black">
          {/* THE ACTUAL PRINTABLE REPORT CONTAINER */}
          <div 
            ref={reportRef}
            id="tus-full-report-preview-container" 
            className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 space-y-8 print:p-0 print:shadow-none print:border-none print:rounded-none print:w-full"
          >
            
            {/* 1. HEADER & VERDICT */}
            <div className="space-y-4">
              <div className="text-center space-y-1 border-b-2 border-blue-900 pb-6">
                <div className="text-sm font-black tracking-widest text-blue-800 uppercase">
                  {meta.companyName || 'AEROSPACE METROLOGY SERVICES'}
                </div>
                <div className="text-xs font-bold text-slate-600">
                  {meta.facilityLocation || 'FACILITY LOCATION'}
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-4">
                  TEMPERATURE UNIFORMITY SURVEY (TUS) REPORT
                </h1>
                <p className="text-[11px] text-slate-600 italic">
                  Certified Compliance with SAE AMS 2750 Rev H & PRI Nadcap AC7102/8
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 text-sm font-black text-center uppercase tracking-wide ${
                overallPassed
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                  : 'bg-red-50 border-red-600 text-red-800'
              }`}>
                {overallPassed
                  ? `SURVEY STATUS: PASS / CONFORMANT — CLASS ${meta.furnaceClass} TOLERANCE SATISFIED`
                  : 'SURVEY STATUS: FAIL / NON-CONFORMANT — ACTION REQUIRED'}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-[11px]">
                <div><span className="text-slate-500 block font-bold uppercase text-[9px]">Report Number</span><span className="font-black text-slate-900">{meta.reportNumber || 'N/A'}</span></div>
                <div><span className="text-slate-500 block font-bold uppercase text-[9px]">Furnace Asset ID</span><span className="font-black text-slate-900">{meta.furnaceId || 'N/A'}</span></div>
                <div><span className="text-slate-500 block font-bold uppercase text-[9px]">Class & Type</span><span className="font-black text-slate-900">Class {meta.furnaceClass} (±{tolerance}{meta.tempUnit}) | Type {meta.instrumentationType}</span></div>
                <div><span className="text-slate-500 block font-bold uppercase text-[9px]">Survey Date</span><span className="font-black text-slate-900">{meta.date}</span></div>
              </div>
            </div>

            {/* 2. SECTION 1: FURNACE & WORK ZONE SPECS */}
            <div>
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 1: FURNACE CHAMBER & QUALIFIED WORK ZONE (QWZ)</div>
              <table className="w-full border-collapse mb-4 text-[11px]">
                <tbody>
                  <tr>
                    <th className="w-1/3 bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Chamber Dimensions</th>
                    <td className="border border-slate-200 p-2">{chamber.length}L × {chamber.width}W × {chamber.height}H {meta.dimUnit}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Qualified Work Zone (QWZ)</th>
                    <td className="border border-slate-200 p-2">{qwz.length}L × {qwz.width}W × {qwz.height}H {meta.dimUnit}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">QWZ Total Volume</th>
                    <td className="border border-slate-200 p-2">{volumeM3.toFixed(3)} m³ ({volumeCuFt.toFixed(1)} ft³)</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Sensor Requirement (AMS 2750 Table 11)</th>
                    <td className="border border-slate-200 p-2">Min {minSensors} sensors required; {channels.length} sensors utilized.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. SECTION 2: SENSOR CLEARANCES */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-2 uppercase tracking-wider text-blue-900">SECTION 2: 6-WAY SURFACE CLEARANCES & OFFSETS</div>
              <p className="text-[10px] text-slate-500 mb-2 italic font-medium">Minimum distances from work zone sensors to nearest internal furnace surfaces (wall, floor, ceiling).</p>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left">TC #</th>
                    <th className="border border-slate-200 p-2 text-left">Label / Position</th>
                    <th className="border border-slate-200 p-2 text-center">Front</th>
                    <th className="border border-slate-200 p-2 text-center">Rear</th>
                    <th className="border border-slate-200 p-2 text-center">Left</th>
                    <th className="border border-slate-200 p-2 text-center">Right</th>
                    <th className="border border-slate-200 p-2 text-center">Floor</th>
                    <th className="border border-slate-200 p-2 text-center">Ceiling</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map(ch => (
                    <tr key={`clearance-${ch.id}`}>
                      <td className="border border-slate-200 p-2 font-bold">{ch.channelNumber}</td>
                      <td className="border border-slate-200 p-2">{ch.label}</td>
                      <td className="border border-slate-200 p-2 text-center">{ch.distFront}{meta.dimUnit}</td>
                      <td className="border border-slate-200 p-2 text-center">{ch.distRear}{meta.dimUnit}</td>
                      <td className="border border-slate-200 p-2 text-center">{ch.distLeft}{meta.dimUnit}</td>
                      <td className="border border-slate-200 p-2 text-center">{ch.distRight}{meta.dimUnit}</td>
                      <td className="border border-slate-200 p-2 text-center">{ch.distFloor}{meta.dimUnit}</td>
                      <td className="border border-slate-200 p-2 text-center">{ch.distCeiling}{meta.dimUnit}</td>
                    </tr>
                  ))}
                  {channels.length === 0 && (
                    <tr>
                      <td colSpan={8} className="border border-slate-200 p-4 text-center text-slate-400 italic">No thermocouple channels defined.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. SECTION 3: 2D TECHNICAL SCHEMATIC */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 3: TECHNICAL SCHEMATIC & SENSOR LAYOUT</div>
              {diagramImageBase64 ? (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-900 flex justify-center shadow-inner">
                  <img src={diagramImageBase64} alt="Furnace Layout" className="max-h-[350px] object-contain" />
                </div>
              ) : (
                <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold uppercase tracking-widest bg-slate-50">
                  Engineering Drawing Snapshot Placeholder
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-2 italic text-center font-medium">Reference: AMS 2750 Rev H Figure 1 Standard Load Grid Configuration.</p>
            </div>

            {/* 5. SECTION 4: METROLOGY TRACEABILITY */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 4: METROLOGY & CALIBRATION TRACEABILITY</div>
              <table className="w-full border-collapse mb-6 text-[11px]">
                <thead>
                  <tr className="bg-blue-50">
                    <th colSpan={2} className="border border-blue-100 p-2 text-left font-black text-blue-900 text-[10px]">PRIMARY TUS RECORDING INSTRUMENT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><th className="w-1/3 bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Manufacturer & Model</th><td className="border border-slate-200 p-2">{instrument.manufacturer || 'N/A'} {instrument.model || ''}</td></tr>
                  <tr><th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Serial Number / Asset ID</th><td className="border border-slate-200 p-2">{instrument.serialNumber || 'N/A'} / {instrument.assetTag || 'N/A'}</td></tr>
                  <tr><th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Calibration Traceability</th><td className="border border-slate-200 p-2">{instrument.traceabilityNumber || 'N/A'} (Lab: {instrument.calibrationLab || 'N/A'})</td></tr>
                  <tr><th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Calibration Date / Due Date</th><td className="border border-slate-200 p-2">{instrument.calibrationDate || 'N/A'} / {instrument.calibrationDueDate || 'N/A'}</td></tr>
                  <tr><th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Accuracy / MPE Limit</th><td className="border border-slate-200 p-2">±{instrument.maxPermissibleError}{meta.tempUnit} (Allowed: ±{meta.tempUnit === '°C' ? '0.6' : '1.1'}{meta.tempUnit})</td></tr>
                  <tr><th className="bg-slate-50 border border-slate-200 p-2 text-left text-[9px] uppercase text-slate-500">Instrument Correction Factor</th><td className="border border-slate-200 p-2">{(instrument.instrumentCorrection ?? 0) >= 0 ? '+' : ''}{instrument.instrumentCorrection ?? 0}{meta.tempUnit} (Arithmetically Applied)</td></tr>
                </tbody>
              </table>

              {instrument.secondaryStandards && instrument.secondaryStandards.length > 0 && (
                <>
                  <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-slate-700 mt-6 px-1">REFERENCE STANDARDS (SECONDARY)</div>
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-200 p-2 text-left">Standard Name</th>
                        <th className="border border-slate-200 p-2 text-left">Serial #</th>
                        <th className="border border-slate-200 p-2 text-left">Traceability #</th>
                        <th className="border border-slate-200 p-2 text-left">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instrument.secondaryStandards.map(sec => (
                        <tr key={sec.id}>
                          <td className="border border-slate-200 p-2">{sec.name}</td>
                          <td className="border border-slate-200 p-2">{sec.serialNumber}</td>
                          <td className="border border-slate-200 p-2">{sec.traceabilityNumber}</td>
                          <td className="border border-slate-200 p-2">{sec.calibrationDueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* 6. SECTION 5: SURVEY DATA RESULTS (THE TABLES) */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 5: TEMPERATURE UNIFORMITY ANALYSIS & SOAK STABILIZATION</div>
              
              {setpoints.length === 0 && (
                <div className="p-10 text-center border border-slate-200 rounded-lg bg-slate-50 text-slate-400 italic">
                  No survey setpoints defined. Ensure data is imported or manually entered in Step 6.
                </div>
              )}

              {setpointAnalyses.map((sa, idx) => {
                // Find matching dwell period for the graph
                const dwell = dwellPeriods?.find(d => Math.abs(d.targetTemp - sa.targetTemp) < 5);
                const buffer = 5;
                const subData = (trendData && dwell) ? trendData.slice(
                  Math.max(0, dwell.startIndex - buffer),
                  Math.min(trendData.length, dwell.endIndex + buffer + 1)
                ) : [];

                return (
                  <div key={`results-${sa.setpointId}`} className="mb-12 page-break-before-always shadow-sm border border-slate-100 rounded-xl p-6 bg-white">
                    <div className="flex items-center justify-between mb-4 border-b-2 border-slate-100 pb-2">
                      <span className="text-[14px] font-black text-blue-900 uppercase">SETPOINT {idx + 1}: {sa.targetTemp}{meta.tempUnit}</span>
                      <span className={`px-3 py-1 rounded text-[11px] font-black border ${sa.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {sa.passed ? 'PASSED / CONFORMANT' : 'FAILED / NON-CONFORMANT'}
                      </span>
                    </div>

                    {/* SOAK STABILIZATION TREND (Requested to be at the top of each soak section) */}
                    {subData.length > 0 && dwell && (
                      <div className="mb-6 space-y-3">
                        <div className="font-black text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" />
                          Soak Stabilization Analysis — {sa.targetTemp}{meta.tempUnit}
                        </div>
                        <div className="h-[280px] w-full border border-slate-200 rounded-lg p-2 bg-slate-950 shadow-inner">
                          <TusTrendGraph 
                            data={subData} 
                            dwells={[dwell]} 
                            channels={channels} 
                            tempUnit={meta.tempUnit} 
                            isZoomed={true}
                            showLegend={false}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
                          <span>SOAK START: {dwell.startTimeStr}</span>
                          <span className="font-bold text-emerald-600">STABILIZATION DURATION: {rowsToMinutes(dwell.startIndex, dwell.endIndex, meta.dataIntervalSeconds)} MIN</span>
                          <span>SOAK END: {dwell.endTimeStr}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-3 mb-6">
                      <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded-xl">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Uniformity Spread</div>
                        <div className={`text-base font-black ${sa.uniformitySpread > (sa.tolerance * 2) ? 'text-red-700' : 'text-slate-900'}`}>{sa.uniformitySpread}{meta.tempUnit}</div>
                        <div className="text-[8px] text-slate-400 mt-1">Limit: ±{sa.tolerance}{meta.tempUnit}</div>
                      </div>
                      <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded-xl">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Max Overshoot</div>
                        <div className={`text-base font-black ${sa.maxOvershoot > (sa.targetTemp + sa.tolerance) ? 'text-red-700' : 'text-slate-900'}`}>{sa.maxOvershoot}{meta.tempUnit}</div>
                        <div className="text-[8px] text-slate-400 mt-1">Limit: {sa.targetTemp + sa.tolerance}{meta.tempUnit}</div>
                      </div>
                      <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded-xl">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Min Corrected</div>
                        <div className="text-base font-black text-slate-900">{sa.minCorrectedTemp}{meta.tempUnit}</div>
                        <div className="text-[8px] text-slate-400 mt-1 truncate">{sa.minSensorLabel}</div>
                      </div>
                      <div className="bg-slate-50 p-3 border border-slate-200 text-center rounded-xl">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Max Corrected</div>
                        <div className="text-base font-black text-slate-900">{sa.maxCorrectedTemp}{meta.tempUnit}</div>
                        <div className="text-[8px] text-slate-400 mt-1 truncate">{sa.maxSensorLabel}</div>
                      </div>
                    </div>

                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-200 p-1.5 text-left w-12">TC #</th>
                          <th className="border border-slate-200 p-1.5 text-left">Label</th>
                          <th className="border border-slate-200 p-1.5 text-center">Raw Reading</th>
                          <th className="border border-slate-200 p-1.5 text-center">TC Corr</th>
                          <th className="border border-slate-200 p-1.5 text-center">Inst Corr</th>
                          <th className="border border-slate-200 p-1.5 text-center font-bold">Corrected</th>
                          <th className="border border-slate-200 p-1.5 text-center">Delta</th>
                          <th className="border border-slate-200 p-1.5 text-center w-16">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sa.channelResults.map(cr => (
                          <tr key={`${sa.setpointId}-${cr.channelId}`} className={cr.inTolerance ? '' : 'bg-red-50'}>
                            <td className="border border-slate-200 p-1.5 font-bold">{cr.channelNumber}</td>
                            <td className="border border-slate-200 p-1.5">{cr.label}</td>
                            <td className="border border-slate-200 p-1.5 text-center">{cr.rawReading}{meta.tempUnit}</td>
                            <td className="border border-slate-200 p-1.5 text-center text-blue-600 font-medium">{cr.tcCorrection >= 0 ? '+' : ''}{cr.tcCorrection}</td>
                            <td className="border border-slate-200 p-1.5 text-center text-slate-500">{(instrument.instrumentCorrection ?? 0) >= 0 ? '+' : ''}{instrument.instrumentCorrection ?? 0}</td>
                            <td className="border border-slate-200 p-1.5 text-center font-black">{cr.correctedTemp}{meta.tempUnit}</td>
                            <td className={`border border-slate-200 p-1.5 text-center font-medium ${cr.deltaFromTarget > 0 ? 'text-red-600' : cr.deltaFromTarget < 0 ? 'text-blue-600' : 'text-slate-500'}`}>{cr.deltaFromTarget >= 0 ? '+' : ''}{cr.deltaFromTarget}</td>
                            <td className={`border border-slate-200 p-1.5 text-center font-bold ${cr.inTolerance ? 'text-emerald-700' : 'text-red-700'}`}>{cr.inTolerance ? 'PASS' : 'FAIL'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {sa.sensorFailureNote && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 italic mt-4 font-medium">
                        <strong>AMS 2750 Rev H Rule:</strong> {sa.sensorFailureNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 7. SECTION 6: MAIN TREND GRAPH */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 6: TUS TEMPERATURE TREND ANALYSIS (FULL SURVEY)</div>
              {trendData && trendData.length > 0 ? (
                <div className="h-[450px] w-full border border-slate-200 rounded-lg p-4 bg-slate-950 shadow-inner">
                  <TusTrendGraph 
                    data={trendData} 
                    dwells={dwellPeriods || []} 
                    channels={channels}
                    tempUnit={meta.tempUnit}
                    showLegend={true}
                  />
                </div>
              ) : (
                <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold uppercase tracking-widest bg-slate-50">
                  Interactive Datalogger Trend Placeholder
                  <p className="text-[10px] lowercase font-normal mt-2 tracking-normal">Import CSV to generate full survey trend.</p>
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-2 italic font-medium text-center">Visual evidence of thermal stabilization and steady-state soak periods per AMS 2750 Rev H Section 3.5.13.</p>
            </div>

            {/* 9. SECTION 8: NADCAP AUDIT CHECKLIST */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 7: NADCAP AC7102/8 AUDIT COMPLIANCE MATRIX</div>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left w-24">Reference Code</th>
                    <th className="border border-slate-200 p-2 text-left">Compliance Question / Audit Requirement</th>
                    <th className="border border-slate-200 p-2 text-center w-20">Audit Result</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.map(item => (
                    <tr key={item.id}>
                      <td className="border border-slate-200 p-2 font-mono font-black text-blue-800">{item.code}</td>
                      <td className="border border-slate-200 p-2">
                        <div className="font-black text-slate-900 mb-0.5">{item.question}</div>
                        {item.notes && <div className="text-[9px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">Metrology Note: {item.notes}</div>}
                      </td>
                      <td className={`border border-slate-200 p-2 text-center font-black ${item.compliant ? 'text-emerald-700' : 'text-red-700'}`}>
                        {item.compliant ? 'YES (PASS)' : 'NO (FAIL)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 10. SECTION 9: AUTHORIZATION & SIGN-OFF */}
            <div className="page-break-before-always">
              <div className="text-[12px] font-bold border-b-2 border-blue-800 pb-1 mb-4 uppercase tracking-wider text-blue-900">SECTION 8: AUTHORIZATION & QUALITY SIGN-OFF</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8">
                <div className="border-t-2 border-slate-300 pt-3 h-28 flex flex-col justify-between">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">TUS Metrology Technician</div>
                  <div className="text-[12px] font-black text-slate-900 border-b border-slate-100 pb-1">{meta.technicianName || 'N/A'}</div>
                  <div className="text-[9px] italic text-slate-400 font-mono">Digitally Verified / Dated</div>
                </div>
                <div className="border-t-2 border-slate-300 pt-3 h-28 flex flex-col justify-between">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Quality Assurance Manager</div>
                  <div className="text-[12px] font-black text-slate-900 border-b border-slate-100 pb-1">{meta.qualityManagerName || 'N/A'}</div>
                  <div className="text-[9px] italic text-slate-400 font-mono">Quality Verification / Dated</div>
                </div>
                <div className="border-t-2 border-slate-300 pt-3 h-28 flex flex-col justify-between">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Level 3 Pyrometry Authority</div>
                  <div className="text-[12px] font-black text-slate-900 border-b border-slate-100 pb-1">{meta.responsibleEngineerName || 'N/A'}</div>
                  <div className="text-[9px] italic text-slate-400 font-mono">Final Approval / Dated</div>
                </div>
              </div>
              <div className="mt-12 p-4 bg-blue-50 border border-blue-100 rounded text-center">
                <p className="text-[9px] text-blue-800 font-bold uppercase tracking-widest">AMS 2750 REV H COMPLIANT AUTOMATED REPORT GENERATION</p>
                <p className="text-[8px] text-blue-600 mt-1 italic">This report was electronically generated and verified for compliance with PRI Nadcap audit requirements.</p>
              </div>
            </div>

            {/* 11. CORRECTIVE ACTIONS (Only rendered if test is a FAIL) */}
            {!overallPassed && correctiveActions && (
              <div className="page-break-before-always">
                <div className="text-[12px] font-bold border-b-2 border-red-800 pb-1 mb-4 uppercase tracking-wider text-red-900 bg-red-50 px-2">APPENDIX: CORRECTIVE ACTIONS & RETEST PLAN</div>
                
                <div className="bg-red-50 border-2 border-red-100 rounded-xl p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="text-[11px] font-black text-red-800 uppercase tracking-widest border-b border-red-200 pb-1">Detected Non-Conformance Summary</div>
                    <ul className="space-y-2 list-disc list-inside px-2">
                      {setpointAnalyses.filter(sa => !sa.passed).map((sa, idx) => (
                        <li key={`fail-summ-${idx}`} className="text-[11px] text-slate-800 font-medium">
                          <strong>Setpoint {sa.targetTemp}{meta.tempUnit}:</strong> {sa.uniformitySpread > (sa.tolerance * 2) ? `Spread limit exceeded (${sa.uniformitySpread}${meta.tempUnit} vs allowed ${sa.tolerance * 2}${meta.tempUnit}). ` : ''} {sa.maxOvershoot > (sa.targetTemp + sa.tolerance) ? `Overshoot exceeded (${sa.maxOvershoot}${meta.tempUnit} vs allowed ${sa.targetTemp + sa.tolerance}${meta.tempUnit}).` : ''}
                        </li>
                      ))}
                      {channels.length < minSensors && <li className="text-[11px] text-slate-800 font-bold">Audit Violation: Sensor count ({channels.length}) is below Table 11 minimum requirement ({minSensors}).</li>}
                      {checklist.filter(i => !i.compliant).map(i => <li key={`f-cl-${i.id}`} className="text-[11px] text-slate-800">Nadcap Requirement Failed: {i.code} - {i.question}</li>)}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-tighter border-l-4 border-red-600 pl-2">Root Cause Analysis:</label>
                      <div className="bg-white border border-slate-300 rounded-lg p-4 text-[11px] min-h-[80px] whitespace-pre-wrap shadow-sm">{correctiveActions.rootCause || 'N/A - Not documented.'}</div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-tighter border-l-4 border-red-600 pl-2">Corrective Action Implemented / Planned:</label>
                      <div className="bg-white border border-slate-300 rounded-lg p-4 text-[11px] min-h-[80px] whitespace-pre-wrap shadow-sm">{correctiveActions.actionTaken || 'N/A - Not documented.'}</div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5 uppercase tracking-tighter border-l-4 border-red-600 pl-2">Formal Retest & Re-verification Plan:</label>
                      <div className="bg-white border border-slate-300 rounded-lg p-4 text-[11px] min-h-[80px] whitespace-pre-wrap shadow-sm">{correctiveActions.retestPlan || 'N/A - Not documented.'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions - Hidden in Print */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Report Audit Verification</span>
              <div className="flex items-center gap-2">
                {overallPassed ? (
                  <span className="text-emerald-400 font-black text-xs flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-4 h-4" /> AMS 2750 PASS
                  </span>
                ) : (
                  <span className="text-red-400 font-black text-xs flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-4 h-4" /> AMS 2750 FAIL
                  </span>
                )}
              </div>
            </div>
            
            {!overallPassed && (
              <div className="hidden lg:flex flex-col border-l border-slate-800 pl-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Action Required</span>
                <span className="text-[10px] text-amber-300 font-medium italic">Append Root Cause Analysis before export</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700 cursor-pointer uppercase tracking-widest"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xl shadow-blue-500/25 cursor-pointer uppercase tracking-widest disabled:opacity-50 disabled:cursor-wait"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF (.pdf)'}</span>
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything first */
          body * { visibility: hidden; }
          /* Only show the modal and its content */
          .fixed, .fixed * { visibility: visible; }
          /* Position the modal correctly for print */
          .fixed {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* Ensure the report container itself is optimized */
          #tus-full-report-preview-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            position: relative !important;
          }
          /* Hide buttons and other non-report UI */
          .print\\:hidden { display: none !important; }
          
          .page-break-before-always { 
            page-break-before: always !important; 
            break-before: page !important;
            padding-top: 10mm !important;
          }
          
          @page { 
            size: portrait; 
            margin: 10mm; 
          }
          
          /* Force background colors and images in print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
};

function rowsToMinutes(start: number, end: number, interval: number): number {
  if (!interval) return 30; // default
  return Math.round(((end - start) * interval) / 60);
}
