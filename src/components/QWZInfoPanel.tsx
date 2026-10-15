import React from 'react';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  DimUnit,
  TestInstrument,
} from '../types/tus';
import {
  calculateVolumeInM3,
  calculateVolumeInCuFt,
  getMinRequiredSensors,
} from '../utils/ams2750';
import {
  Layers,
  Ruler,
  Box,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Info,
  Maximize2,
  Compass,
  Wrench,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface QWZInfoPanelProps {
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  channels: ThermocoupleChannel[];
  dimUnit: DimUnit;
  selectedChannelId: string | null;
  instrument?: TestInstrument;
  tempUnit?: '°C' | '°F';
  onSelectChannel: (id: string) => void;
  onOpenRiggingGuide?: () => void;
  onFitSensorsToQWZ?: (count?: number) => void;
  onNavigateTab?: (tab: string) => void;
}

export const QWZInfoPanel: React.FC<QWZInfoPanelProps> = ({
  chamber,
  qwz,
  channels,
  dimUnit,
  selectedChannelId,
  instrument,
  tempUnit = '°C',
  onSelectChannel,
  onOpenRiggingGuide,
  onFitSensorsToQWZ,
  onNavigateTab,
}) => {
  const volumeM3 = calculateVolumeInM3(qwz, dimUnit);
  const volumeCuFt = calculateVolumeInCuFt(qwz, dimUnit);
  const { minSensors, additionalSensors } = getMinRequiredSensors(volumeCuFt, volumeM3);
  const meetsSensorCount = channels.length >= minSensors;

  // Calibration status
  const today = new Date();
  const hasCalDetails = Boolean(
    instrument?.calibrationDate?.trim() &&
    instrument?.calibrationDueDate?.trim() &&
    instrument?.traceabilityNumber?.trim()
  );
  const dueDate = instrument?.calibrationDueDate ? new Date(instrument.calibrationDueDate) : null;
  let calDaysRemaining: number | null = null;
  let isCalValid = false;
  if (hasCalDetails && dueDate && !isNaN(dueDate.getTime())) {
    calDaysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (calDaysRemaining >= 0) isCalValid = true;
  }

  const chamberVolM3 =
    dimUnit === 'mm'
      ? (chamber.length * chamber.width * chamber.height) / 1_000_000_000
      : ((chamber.length * chamber.width * chamber.height) / 1728) * 0.0283168;

  const fillPercentage =
    chamberVolM3 > 0 ? Math.min(100, Math.round((volumeM3 / chamberVolM3) * 1000) / 10) : 0;

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 lg:p-5 space-y-4 shadow-xl">
      {/* 1. Header with Live Dynamic Sizing Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <span>Work Zone Geometry & Clearance Readout</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                LIVE AUTO-SYNC
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Dynamically recalculates all volumetric metrics, sensor minimums, and 6-way clearances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold">
            QWZ: {volumeM3.toFixed(3)} m³ ({(volumeM3 * 1000).toFixed(0)} L)
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg border font-bold ${
              meetsSensorCount
                ? 'bg-blue-950/80 border-blue-800 text-cyan-300'
                : 'bg-amber-950/80 border-amber-800 text-amber-300 animate-pulse'
            }`}
          >
            {channels.length} Sensors ({meetsSensorCount ? 'Compliant' : `Min ${minSensors}`})
          </span>
        </div>
      </div>

      {/* Sensor Count Compliance & Auto-Adjustment Alert Banner */}
      {!meetsSensorCount && onFitSensorsToQWZ && (
        <div className="bg-amber-950/60 border border-amber-700/80 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-amber-200">
              <span className="font-bold">AMS 2750 Rev H Table 11 Alert: </span>
              Volume is <strong>{volumeM3.toFixed(3)} m³</strong> which requires at least{' '}
              <strong className="text-white underline">{minSensors} sensors</strong> (currently {channels.length}).
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onFitSensorsToQWZ(minSensors)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow-sm transition-colors"
            >
              Auto-Adjust to {minSensors} Sensors
            </button>
            <button
              onClick={() => onFitSensorsToQWZ(14)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700 cursor-pointer transition-colors"
            >
              Set 14 (Balanced)
            </button>
          </div>
        </div>
      )}

      {/* 2. Key Dimensions Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Work Zone Envelope */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <div className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
            <span>Work Zone (L×W×H):</span>
            <span className="text-[10px] font-mono text-cyan-400">{dimUnit}</span>
          </div>
          <div className="font-mono font-bold text-slate-100 text-sm">
            {qwz.length} × {qwz.width} × {qwz.height}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {dimUnit === 'mm' ? (
              <span>
                {(qwz.length / 1000).toFixed(2)}m × {(qwz.width / 1000).toFixed(2)}m ×{' '}
                {(qwz.height / 1000).toFixed(2)}m
              </span>
            ) : (
              <span>{volumeCuFt.toFixed(1)} ft³ total</span>
            )}
          </div>
        </div>

        {/* Work Zone Volume */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">QWZ Volume & Mass:</div>
          <div className="font-mono font-bold text-emerald-400 text-sm">
            {volumeM3.toFixed(3)} m³
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {(volumeM3 * 1000).toFixed(0)} Litres / {volumeCuFt.toFixed(1)} ft³
          </div>
        </div>

        {/* AMS 2750 Rev H Table 11 Sensors */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">AMS 2750 Table 11 Min:</div>
          <div className="font-mono font-bold text-cyan-300 text-sm">
            {minSensors} Sensors Minimum
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            9 Baseline + {additionalSensors} Excess Vol
          </div>
        </div>

        {/* Furnace Chamber Envelope */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">Chamber (L×W×H):</div>
          <div className="font-mono font-bold text-slate-200 text-sm">
            {chamber.length} × {chamber.width} × {chamber.height}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Fill Ratio: {fillPercentage}% of chamber
          </div>
        </div>
      </div>

      {/* 3. Six-Way Internal Clearances (Physical Wall/Hearth Separation) */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-amber-400" />
            <span>6-Way Surface Clearances to Internal Chamber Walls & Hearth:</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            All values in {dimUnit}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
          {/* Arrow 'a': Side / Right Wall */}
          <div className="bg-slate-900 border border-blue-900/60 rounded-lg p-2 text-center space-y-0.5">
            <span className="text-[10px] text-blue-400 font-bold block">Arrow 'a' (Right Wall)</span>
            <span className="text-sm font-bold text-white">{qwz.offsetRight}</span>
            <span className="text-[10px] text-slate-500 block">{dimUnit}</span>
          </div>

          {/* Arrow 'b': Hearth Floor */}
          <div className="bg-slate-900 border border-blue-900/60 rounded-lg p-2 text-center space-y-0.5">
            <span className="text-[10px] text-blue-400 font-bold block">Arrow 'b' (Hearth Floor)</span>
            <span className="text-sm font-bold text-white">{qwz.offsetFloor}</span>
            <span className="text-[10px] text-slate-500 block">{dimUnit}</span>
          </div>

          {/* Left Wall */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center space-y-0.5">
            <span className="text-[10px] text-slate-400 block">Left Wall</span>
            <span className="text-sm font-bold text-slate-200">{qwz.offsetLeft}</span>
            <span className="text-[10px] text-slate-500 block">{dimUnit}</span>
          </div>

          {/* Front Door */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center space-y-0.5">
            <span className="text-[10px] text-slate-400 block">Front Door</span>
            <span className="text-sm font-bold text-slate-200">{qwz.offsetFront}</span>
            <span className="text-[10px] text-slate-500 block">{dimUnit}</span>
          </div>

          {/* Rear Wall */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center space-y-0.5">
            <span className="text-[10px] text-slate-400 block">Rear Wall</span>
            <span className="text-sm font-bold text-slate-200">{qwz.offsetRear}</span>
            <span className="text-[10px] text-slate-500 block">{dimUnit}</span>
          </div>

          {/* Ceiling / Roof */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center space-y-0.5">
            <span className="text-[10px] text-slate-400 block">Roof / Ceiling</span>
            <span className="text-sm font-bold text-slate-200">{qwz.offsetCeiling}</span>
            <span className="text-[10px] text-slate-500 block">{dimUnit}</span>
          </div>
        </div>
      </div>

      {/* 4. Active Selected Thermocouple Sensor Coordinate & Distance Inspector */}
      {selectedChannel && (
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-bold text-white text-xs">
                Selected Probe: <strong className="text-cyan-300 font-mono">{selectedChannel.label}</strong>
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              3D Position: X={selectedChannel.x}, Y={selectedChannel.y}, Z={selectedChannel.z} {dimUnit}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono text-slate-300 bg-slate-900/90 rounded-lg p-2 border border-slate-800/60">
            <div>To Front: <strong className="text-white">{selectedChannel.distFront}</strong> {dimUnit}</div>
            <div>To Rear: <strong className="text-white">{selectedChannel.distRear}</strong> {dimUnit}</div>
            <div>To Floor: <strong className="text-white">{selectedChannel.distFloor}</strong> {dimUnit}</div>
            <div>To Roof: <strong className="text-white">{selectedChannel.distCeiling}</strong> {dimUnit}</div>
            <div>To Left: <strong className="text-white">{selectedChannel.distLeft}</strong> {dimUnit}</div>
            <div>To Right: <strong className="text-white">{selectedChannel.distRight}</strong> {dimUnit}</div>
          </div>
        </div>
      )}

      {/* 5. Physical Wire Grid Rigging Backbone (Opposite-Corner Logic) */}
      <div className="space-y-2 border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Physical Wire Web Construction: 4 Main 3D Opposite-Corner Diagonals</span>
          </div>
          {onOpenRiggingGuide && (
            <button
              onClick={onOpenRiggingGuide}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Wire Cutting List</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 4 Diagonals Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-slate-950/80 border border-blue-900/40 rounded-lg p-2 flex items-center justify-between text-slate-300">
            <span>
              <strong className="text-blue-400">Diag 1:</strong> Front Lower Left (TC 4) ➔ Rear Upper Right
            </span>
            <span className="text-cyan-300 font-bold">
              {Math.round(Math.sqrt(qwz.length * qwz.length + qwz.width * qwz.width + qwz.height * qwz.height))} {dimUnit}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-blue-900/40 rounded-lg p-2 flex items-center justify-between text-slate-300">
            <span>
              <strong className="text-blue-400">Diag 2:</strong> Front Lower Right (TC 3) ➔ Rear Upper Left
            </span>
            <span className="text-cyan-300 font-bold">
              {Math.round(Math.sqrt(qwz.length * qwz.length + qwz.width * qwz.width + qwz.height * qwz.height))} {dimUnit}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-blue-900/40 rounded-lg p-2 flex items-center justify-between text-slate-300">
            <span>
              <strong className="text-blue-400">Diag 3:</strong> Front Upper Left (TC 1) ➔ Rear Lower Right
            </span>
            <span className="text-cyan-300 font-bold">
              {Math.round(Math.sqrt(qwz.length * qwz.length + qwz.width * qwz.width + qwz.height * qwz.height))} {dimUnit}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-blue-900/40 rounded-lg p-2 flex items-center justify-between text-slate-300">
            <span>
              <strong className="text-blue-400">Diag 4:</strong> Front Upper Right (TC 2) ➔ Rear Lower Left
            </span>
            <span className="text-cyan-300 font-bold">
              {Math.round(Math.sqrt(qwz.length * qwz.length + qwz.width * qwz.width + qwz.height * qwz.height))} {dimUnit}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed font-sans pt-1">
          • <strong>Assembly Note:</strong> The 4 continuous cables above form the primary 3D X-truss through the center spider hub. Once anchored, the 12 perimeter frame wires and face cross-ties are added to complete the web.
        </p>
      </div>

      {/* 6. Dedicated Test Equipment & Calibration Summary Ribbon */}
      {instrument && (
        <div className="bg-slate-950/90 border border-cyan-900/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-slate-200 font-semibold flex items-center gap-2 flex-wrap">
                <span>Test Instrument: <strong className="text-white">{instrument.manufacturer} {instrument.model}</strong></span>
                {!hasCalDetails ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                    NO CALIBRATION DETAILS ENTERED
                  </span>
                ) : isCalValid ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    UKAS CAL VALID ({calDaysRemaining}d)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                    CAL EXPIRED
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                S/N: {instrument.serialNumber} • Traceability: {instrument.traceabilityNumber} • MPE: ±{instrument.maxPermissibleError}{tempUnit}
              </div>
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('equipment')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-medium border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto shrink-0"
            >
              <span>Edit Equipment & Cal Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
