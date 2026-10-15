import React, { useState, useEffect } from 'react';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  DimUnit,
  TestInstrument,
} from '../types/tus';
import { calculateVolumeInM3, calculateVolumeInCuFt, getMinRequiredSensors } from '../utils/ams2750';
import {
  Box,
  Layers,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Maximize2,
  Info,
  Wrench,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Clock,
  RotateCcw,
  Compass,
  Trash2,
  Plus,
} from 'lucide-react';

export interface ChamberPreset {
  id: string;
  name: string;
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
}

interface DimensionInputsProps {
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  dimUnit: DimUnit;
  channelCount: number;
  tempUnit?: '°C' | '°F';
  instrument?: TestInstrument;
  chamberPresets: ChamberPreset[];
  onUpdateChamber: (c: FurnaceChamber) => void;
  onUpdateQWZ: (q: QualifiedWorkZone) => void;
  onApplyPreset: (id: string) => void;
  onSaveCurrentAsPreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onFitSensorsToQWZ: (count?: number) => void;
  onUpdateInstrument?: (inst: TestInstrument) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DimensionInputs: React.FC<DimensionInputsProps> = ({
  chamber,
  qwz,
  dimUnit,
  channelCount,
  tempUnit = '°C',
  instrument,
  chamberPresets,
  onUpdateChamber,
  onUpdateQWZ,
  onApplyPreset,
  onSaveCurrentAsPreset,
  onDeletePreset,
  onRenamePreset,
  onFitSensorsToQWZ,
  onUpdateInstrument,
  onNavigateTab,
}) => {
  const [autoCenter, setAutoCenter] = useState<boolean>(false);
  const [newPresetInputName, setNewPresetInputName] = useState('');

  // Local string inputs for smooth, uninterrupted backspacing and typing
  const [chamberInputs, setChamberInputs] = useState({
    length: String(chamber.length),
    width: String(chamber.width),
    height: String(chamber.height),
  });

  const [qwzInputs, setQwzInputs] = useState({
    length: String(qwz.length),
    width: String(qwz.width),
    height: String(qwz.height),
    offsetLeft: String(qwz.offsetLeft),
    offsetRight: String(qwz.offsetRight),
    offsetFront: String(qwz.offsetFront),
    offsetRear: String(qwz.offsetRear),
    offsetFloor: String(qwz.offsetFloor),
    offsetCeiling: String(qwz.offsetCeiling),
  });

  // Sync local inputs when parent chamber/qwz props change (e.g., presets)
  useEffect(() => {
    setChamberInputs({
      length: chamber.length > 0 ? String(chamber.length) : '',
      width: chamber.width > 0 ? String(chamber.width) : '',
      height: chamber.height > 0 ? String(chamber.height) : '',
    });
  }, [chamber.length, chamber.width, chamber.height]);

  useEffect(() => {
    setQwzInputs({
      length: qwz.length > 0 ? String(qwz.length) : '',
      width: qwz.width > 0 ? String(qwz.width) : '',
      height: qwz.height > 0 ? String(qwz.height) : '',
      offsetLeft: qwz.offsetLeft > 0 ? String(qwz.offsetLeft) : '',
      offsetRight: qwz.offsetRight > 0 ? String(qwz.offsetRight) : '',
      offsetFront: qwz.offsetFront > 0 ? String(qwz.offsetFront) : '',
      offsetRear: qwz.offsetRear > 0 ? String(qwz.offsetRear) : '',
      offsetFloor: qwz.offsetFloor > 0 ? String(qwz.offsetFloor) : '',
      offsetCeiling: qwz.offsetCeiling > 0 ? String(qwz.offsetCeiling) : '',
    });
  }, [
    qwz.length,
    qwz.width,
    qwz.height,
    qwz.offsetLeft,
    qwz.offsetRight,
    qwz.offsetFront,
    qwz.offsetRear,
    qwz.offsetFloor,
    qwz.offsetCeiling,
  ]);

  const volumeM3 = calculateVolumeInM3(qwz, dimUnit);
  const volumeCuFt = calculateVolumeInCuFt(qwz, dimUnit);
  const {
    minSensors,
    ruleText,
    formulaBreakdown,
    baselineSensors,
    additionalSensors,
  } = getMinRequiredSensors(volumeCuFt, volumeM3);
  const meetsSensorCount = channelCount >= minSensors;

  // 3D Opposite-corner main diagonal wire length
  const diagonal3DLength = Math.round(
    Math.sqrt(qwz.length * qwz.length + qwz.width * qwz.width + qwz.height * qwz.height)
  );

  // Total 12-wire perimeter box length
  const perimeterWireLength = 4 * (qwz.length + qwz.width + qwz.height);

  // Handler for chamber size changes
  const handleChamberChange = (field: keyof FurnaceChamber, val: number | string) => {
    const raw = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(raw) || raw <= 0) return;
    const num = raw;
    const updatedChamber = { ...chamber, [field]: num };

    if (field === 'length') {
      updatedChamber.feedthroughPos = { ...chamber.feedthroughPos, x: num };
    } else if (field === 'width') {
      updatedChamber.feedthroughPos = { ...chamber.feedthroughPos, z: num / 2 };
    } else if (field === 'height') {
      updatedChamber.feedthroughPos = { ...chamber.feedthroughPos, y: num * 0.75 };
    }

    onUpdateChamber(updatedChamber);

    // If auto-centering is active, auto-adjust clearances to center QWZ inside the new chamber
    if (autoCenter) {
      const extraL = Math.max(0, updatedChamber.length - qwz.length);
      const extraW = Math.max(0, updatedChamber.width - qwz.width);
      const extraH = Math.max(0, updatedChamber.height - qwz.height);

      const updatedQWZ: QualifiedWorkZone = {
        ...qwz,
        offsetFront: Math.round(extraL / 2),
        offsetRear: Math.round(extraL / 2),
        offsetLeft: Math.round(extraW / 2),
        offsetRight: Math.round(extraW / 2),
        offsetFloor: Math.round(extraH * 0.45),
        offsetCeiling: Math.round(extraH * 0.55),
      };
      onUpdateQWZ(updatedQWZ);
    }
  };

  // Handler for QWZ changes: ensures clearances and chamber auto-adjust seamlessly
  const handleQWZChange = (field: keyof QualifiedWorkZone, val: number | string) => {
    const raw = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(raw) || raw <= 0) return;
    const num = raw;
    const updatedQWZ = { ...qwz, [field]: num };

    // Keep existing clearances or standard defaults if not set
    const defaultClearance = dimUnit === 'mm' ? 150 : 6;
    updatedQWZ.offsetLeft = qwz.offsetLeft > 0 ? qwz.offsetLeft : defaultClearance;
    updatedQWZ.offsetRight = qwz.offsetRight > 0 ? qwz.offsetRight : defaultClearance;
    updatedQWZ.offsetFront = qwz.offsetFront > 0 ? qwz.offsetFront : defaultClearance;
    updatedQWZ.offsetRear = qwz.offsetRear > 0 ? qwz.offsetRear : defaultClearance;
    updatedQWZ.offsetFloor = qwz.offsetFloor > 0 ? qwz.offsetFloor : (dimUnit === 'mm' ? 120 : 5);
    updatedQWZ.offsetCeiling = qwz.offsetCeiling > 0 ? qwz.offsetCeiling : (dimUnit === 'mm' ? 180 : 7);

    // Check if chamber needs to be expanded so it encloses the new QWZ + clearances
    const reqL = updatedQWZ.offsetFront + updatedQWZ.length + updatedQWZ.offsetRear;
    const reqW = updatedQWZ.offsetLeft + updatedQWZ.width + updatedQWZ.offsetRight;
    const reqH = updatedQWZ.offsetFloor + updatedQWZ.height + updatedQWZ.offsetCeiling;

    let newChamber = { ...chamber };
    let chamberChanged = false;
    if (reqL > chamber.length) {
      newChamber.length = reqL;
      newChamber.feedthroughPos = { ...newChamber.feedthroughPos, x: reqL };
      chamberChanged = true;
    }
    if (reqW > chamber.width) {
      newChamber.width = reqW;
      newChamber.feedthroughPos = { ...newChamber.feedthroughPos, z: reqW / 2 };
      chamberChanged = true;
    }
    if (reqH > chamber.height) {
      newChamber.height = reqH;
      newChamber.feedthroughPos = { ...newChamber.feedthroughPos, y: reqH * 0.75 };
      chamberChanged = true;
    }

    if (chamberChanged) {
      onUpdateChamber(newChamber);
    }
    onUpdateQWZ(updatedQWZ);
  };

  // Direct manual override of clearances/offsets
  const handleOffsetChange = (field: keyof QualifiedWorkZone, val: string) => {
    const raw = parseFloat(val);
    if (isNaN(raw) || raw < 0) return;
    const num = raw;
    const updated = { ...qwz, [field]: num };

    // Ensure chamber fits QWZ + updated clearance
    const reqL = updated.offsetFront + updated.length + updated.offsetRear;
    const reqW = updated.offsetLeft + updated.width + updated.offsetRight;
    const reqH = updated.offsetFloor + updated.height + updated.offsetCeiling;

    let newChamber = { ...chamber };
    let chamberChanged = false;
    if (reqL > chamber.length) { newChamber.length = reqL; chamberChanged = true; }
    if (reqW > chamber.width) { newChamber.width = reqW; chamberChanged = true; }
    if (reqH > chamber.height) { newChamber.height = reqH; chamberChanged = true; }

    if (chamberChanged) {
      onUpdateChamber(newChamber);
    }
    onUpdateQWZ(updated);
  };

  // Center QWZ within chamber with equal left/right and front/rear margins
  const handleCenterWorkZone = () => {
    const extraL = Math.max(0, chamber.length - qwz.length);
    const extraW = Math.max(0, chamber.width - qwz.width);
    const extraH = Math.max(0, chamber.height - qwz.height);

    const centeredQWZ: QualifiedWorkZone = {
      ...qwz,
      offsetFront: Math.round(extraL / 2),
      offsetRear: Math.round(extraL / 2),
      offsetLeft: Math.round(extraW / 2),
      offsetRight: Math.round(extraW / 2),
      offsetFloor: Math.round(extraH * 0.45),
      offsetCeiling: Math.round(extraH * 0.55),
    };
    onUpdateQWZ(centeredQWZ);
  };

  // Controlled input typing handlers for chamber
  const onChamberInputChange = (field: 'length' | 'width' | 'height', val: string) => {
    setChamberInputs((prev) => ({ ...prev, [field]: val }));
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      handleChamberChange(field, num);
    }
  };

  const onChamberInputBlur = (field: 'length' | 'width' | 'height') => {
    const num = parseFloat(chamberInputs[field]);
    if (isNaN(num) || num <= 0) {
      setChamberInputs((prev) => ({ ...prev, [field]: String(chamber[field]) }));
    }
  };

  // Controlled input typing handlers for QWZ
  const onQwzInputChange = (field: 'length' | 'width' | 'height', val: string) => {
    setQwzInputs((prev) => ({ ...prev, [field]: val }));
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      handleQWZChange(field, num);
    }
  };

  const onQwzInputBlur = (field: 'length' | 'width' | 'height') => {
    const num = parseFloat(qwzInputs[field]);
    if (isNaN(num) || num <= 0) {
      setQwzInputs((prev) => ({ ...prev, [field]: String(qwz[field]) }));
    }
  };

  // Controlled input typing handlers for offsets/clearances
  const onOffsetInputChange = (field: keyof QualifiedWorkZone, val: string) => {
    setQwzInputs((prev) => ({ ...prev, [field]: val }));
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      handleOffsetChange(field, String(num));
    }
  };

  const onOffsetInputBlur = (field: keyof QualifiedWorkZone) => {
    const num = parseFloat(qwzInputs[field] as string);
    if (isNaN(num) || num < 0) {
      setQwzInputs((prev) => ({ ...prev, [field]: String(qwz[field]) }));
    }
  };

  // Presets for instrument
  const applyInstrumentPreset = (presetKey: string) => {
    if (!onUpdateInstrument || !instrument) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const sixMonthsLater = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];

    if (presetKey === 'yokogawa') {
      onUpdateInstrument({
        ...instrument,
        manufacturer: 'Yokogawa Metrology UK',
        model: 'DX2030 Paperless Advanced TUS Recorder',
        serialNumber: 'YK-884920-TUS',
        assetTag: 'AST-AERO-042',
        equipmentType: 'Paperless Video Graphic TUS Data Logger',
        calibrationDate: todayStr,
        calibrationDueDate: sixMonthsLater,
        traceabilityNumber: 'UKAS-CAL-74921-2026',
        calibrationLab: 'Trescal UK Metrology Services (UKAS Accredited Lab #0123)',
        calibrationStandard: 'UKAS / ISO/IEC 17025 Accredited Calibration',
        maxPermissibleError: 0.2,
      });
    } else if (presetKey === 'eurotherm') {
      onUpdateInstrument({
        ...instrument,
        manufacturer: 'Eurotherm by Schneider Electric',
        model: 'Nanodac Multi-Channel Precision TUS Recorder',
        serialNumber: 'ET-554109-ND',
        assetTag: 'AST-AERO-088',
        equipmentType: 'Digital Graphic Recorder / Controller',
        calibrationDate: todayStr,
        calibrationDueDate: sixMonthsLater,
        traceabilityNumber: 'NIST-CAL-99382-2026',
        calibrationLab: 'Eurotherm UKAS Calibration Laboratory',
        calibrationStandard: 'ISO/IEC 17025 Accredited Laboratory',
        maxPermissibleError: 0.25,
      });
    } else if (presetKey === 'fluke') {
      onUpdateInstrument({
        ...instrument,
        manufacturer: 'Fluke Calibration',
        model: 'Hydra Series III 2638A Precision Data Acquisition System',
        serialNumber: 'FLK-410982-HY',
        assetTag: 'AST-MET-115',
        equipmentType: 'High-Accuracy Data Acquisition System',
        calibrationDate: todayStr,
        calibrationDueDate: oneYearLater,
        traceabilityNumber: 'UKAS-FLK-88123-2026',
        calibrationLab: 'Fluke UK Service & Metrology Centre',
        calibrationStandard: 'UKAS National Physical Laboratory (NPL) Traceable',
        maxPermissibleError: 0.18,
      });
    } else if (presetKey === 'keysight') {
      onUpdateInstrument({
        ...instrument,
        manufacturer: 'Keysight Technologies',
        model: 'DAQ970A Precision Metrology Data Acquisition System',
        serialNumber: 'MY-59002341',
        assetTag: 'AST-MET-204',
        equipmentType: '6½-Digit Multimeter & Multiplexer DAS',
        calibrationDate: todayStr,
        calibrationDueDate: oneYearLater,
        traceabilityNumber: 'NIST-821-24910-KEY',
        calibrationLab: 'Keysight Accredited Metrology Laboratory',
        calibrationStandard: 'ANSI/NCSL Z540-1-1994 Traceable',
        maxPermissibleError: 0.15,
      });
    }
  };

  // Calibration status calculation
  const today = new Date();
  const dueDate = instrument?.calibrationDueDate ? new Date(instrument.calibrationDueDate) : null;
  let daysRemaining: number | null = null;
  let calStatus: 'valid' | 'expiring' | 'expired' = 'valid';

  if (dueDate && !isNaN(dueDate.getTime())) {
    const diffTime = dueDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) calStatus = 'expired';
    else if (daysRemaining <= 30) calStatus = 'expiring';
    else calStatus = 'valid';
  }

  return (
    <div className="space-y-6">
      {/* Quick Template Presets (UK Metric Standard) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Furnace Dimensions & Architecture Presets:
          </span>
          <span className="text-xs text-slate-500">Auto-configures dimensions, clearances & sensors</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chamberPresets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 transition-all font-medium"
            >
              <button
                onClick={() => onApplyPreset(preset.id)}
                className="hover:text-cyan-300 text-left truncate cursor-pointer"
                title="Apply preset"
              >
                {preset.name}
              </button>
              <button
                onClick={() => {
                  const newName = prompt('Enter new name for preset:', preset.name);
                  if (newName) onRenamePreset(preset.id, newName);
                }}
                className="text-slate-400 hover:text-slate-200 ml-1 px-1 text-[10px] cursor-pointer"
                title="Rename preset"
              >
                ✏️
              </button>
              <button
                onClick={() => onDeletePreset(preset.id)}
                className="text-red-400 hover:text-red-300 ml-0.5 p-0.5 cursor-pointer"
                title="Delete preset"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Save Current as Preset Form */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
          <input
            type="text"
            placeholder="New preset name (e.g. Custom Chamber A)..."
            value={newPresetInputName}
            onChange={(e) => setNewPresetInputName(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 flex-1"
          />
          <button
            onClick={() => {
              onSaveCurrentAsPreset(newPresetInputName);
              setNewPresetInputName('');
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Save Current as Preset
          </button>
        </div>
      </div>

      {/* Grid: Chamber Dimensions & Qualified Work Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Internal Chamber Dimensions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-slate-100 text-sm">
                1. Internal Furnace Chamber Dimensions
              </h3>
            </div>
            <span className="text-xs font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded">
              Unit: {dimUnit}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Length (Depth)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={dimUnit === 'mm' ? '10' : '0.5'}
                  value={chamberInputs.length}
                  onChange={(e) => onChamberInputChange('length', e.target.value)}
                  onBlur={() => onChamberInputBlur('length')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {dimUnit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Width (Left-Right)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={dimUnit === 'mm' ? '10' : '0.5'}
                  value={chamberInputs.width}
                  onChange={(e) => onChamberInputChange('width', e.target.value)}
                  onBlur={() => onChamberInputBlur('width')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {dimUnit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Height (Floor-Roof)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={dimUnit === 'mm' ? '10' : '0.5'}
                  value={chamberInputs.height}
                  onChange={(e) => onChamberInputChange('height', e.target.value)}
                  onBlur={() => onChamberInputBlur('height')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {dimUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Chamber Shape & Cable Feedthrough */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Chamber Geometry
              </label>
              <select
                value={chamber.shape}
                onChange={(e) =>
                  onUpdateChamber({ ...chamber, shape: e.target.value as 'rectangular' | 'cylindrical' })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="rectangular">Rectangular Box / Car-Bottom</option>
                <option value="cylindrical">Cylindrical Retort / Pit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                TUS Wire Feedthrough Location
              </label>
              <select
                value={chamber.feedthroughWall}
                onChange={(e) => {
                  const wall = e.target.value as 'rear' | 'roof' | 'left' | 'right' | 'under_door';
                  let ftPos = { ...chamber.feedthroughPos };
                  if (wall === 'rear') ftPos = { x: chamber.length, y: chamber.height * 0.75, z: chamber.width / 2 };
                  else if (wall === 'roof') ftPos = { x: chamber.length / 2, y: chamber.height, z: chamber.width / 2 };
                  else if (wall === 'left') ftPos = { x: chamber.length / 2, y: chamber.height * 0.75, z: 0 };
                  else if (wall === 'right') ftPos = { x: chamber.length / 2, y: chamber.height * 0.75, z: chamber.width };
                  else if (wall === 'under_door') ftPos = { x: 0, y: 15, z: chamber.width / 2 };
                  onUpdateChamber({ ...chamber, feedthroughWall: wall, feedthroughPos: ftPos });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="under_door">Under Door / Front Threshold Seal</option>
                <option value="rear">Rear Wall Penetration Port</option>
                <option value="roof">Roof / Ceiling Feedthrough Gland</option>
                <option value="left">Left Side Port</option>
                <option value="right">Right Side Port</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Qualified Work Zone Dimensions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-slate-100 text-sm">
                2. Qualified Work Zone (QWZ)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
              <span className="font-bold">{volumeM3.toFixed(3)} m³</span>
              <span className="text-emerald-500">({(volumeM3 * 1000).toFixed(0)} L / {volumeCuFt.toFixed(1)} ft³)</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                QWZ Length
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={dimUnit === 'mm' ? '10' : '0.5'}
                  value={qwzInputs.length}
                  onChange={(e) => onQwzInputChange('length', e.target.value)}
                  onBlur={() => onQwzInputBlur('length')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {dimUnit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                QWZ Width
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={dimUnit === 'mm' ? '10' : '0.5'}
                  value={qwzInputs.width}
                  onChange={(e) => onQwzInputChange('width', e.target.value)}
                  onBlur={() => onQwzInputBlur('width')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {dimUnit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                QWZ Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={dimUnit === 'mm' ? '10' : '0.5'}
                  value={qwzInputs.height}
                  onChange={(e) => onQwzInputChange('height', e.target.value)}
                  onBlur={() => onQwzInputBlur('height')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {dimUnit}
                </span>
              </div>
            </div>
          </div>

          {/* AMS 2750 Rev H Rule Badge & Math Transparency */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              meetsSensorCount
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {meetsSensorCount ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 flex-1">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>{ruleText}</span>
                  <span className="font-mono bg-slate-900/90 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-800/80">
                    AMS 2750 Min: {minSensors} Sensors
                  </span>
                </div>

                {/* Step-by-Step AMS 2750 Rev H Table 11 Mathematical Derivation */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-[11px] space-y-1.5 font-mono text-slate-300">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>AMS 2750 Rev H Table 11 Mathematical Derivation:</span>
                  </div>
                  <div>• Work Zone Volume = {qwz.length} × {qwz.width} × {qwz.height} {dimUnit} = <strong className="text-white">{volumeM3.toFixed(3)} m³</strong> ({volumeCuFt.toFixed(1)} ft³)</div>
                  <div>• Baseline Requirement: First 6.4 m³ (225 ft³) = <strong className="text-white">9 sensors</strong> (8 corners + 1 center)</div>
                  <div>
                    • Excess Volume: {volumeM3.toFixed(3)} m³ − 6.4 m³ = <strong className="text-white">{(Math.max(0, volumeM3 - 6.4)).toFixed(3)} m³</strong>
                  </div>
                  <div>
                    • Additional Sensors: ⌈{(Math.max(0, volumeM3 - 6.4)).toFixed(2)} m³ / 2.83 m³⌉ = <strong className="text-cyan-300">{additionalSensors} additional</strong> (1 per 2.83 m³ / 100 ft³ excess)
                  </div>
                  <div className="text-emerald-400 pt-1 font-bold border-t border-slate-800">
                    Total Required Minimum = 9 + {additionalSensors} = {minSensors} Sensors (AMS 2750 Rev H Table 11)
                  </div>
                  <div className="text-slate-400 font-sans text-[11px] pt-1">
                    <em>Aerospace Engineering Note:</em> While <strong>{minSensors} sensors</strong> is 100% compliant with AMS 2750 Rev H Table 11, placing an odd number across a 6-sided box furnace creates asymmetry. Most Nadcap-accredited heat treaters use <strong>14 sensors</strong> (symmetrical 6 faces).
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 pt-0.5">
                  Currently configured: <strong className="text-white font-mono">{channelCount} sensors</strong> (
                  {meetsSensorCount ? <span className="text-emerald-400 font-bold">100% Compliant</span> : <span className="text-amber-400 font-bold">Need at least {minSensors}</span>})
                </div>
              </div>
            </div>

            {/* Quick Action Buttons to Fit Wire Grid or Set Sensor Counts (21 sensors preset removed) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => onFitSensorsToQWZ()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                title="Rescale wire grid and all sensors to perfectly span the current QWZ boundaries"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Snap Wire Grid to Fill QWZ</span>
              </button>

              <button
                onClick={() => onFitSensorsToQWZ(minSensors)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-medium text-xs border border-slate-700 cursor-pointer"
                title={`Generate minimum ${minSensors} sensor pattern required by AMS 2750 Rev H Table 11`}
              >
                Set {minSensors} Sensors (Table 11 Min)
              </button>

              <button
                onClick={() => onFitSensorsToQWZ(14)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono font-medium text-xs border border-slate-700 cursor-pointer"
                title="Generate 14-sensor balanced pattern (8 corners + 1 center + 5 faces)"
              >
                Set 14 Sensors (Balanced 6-Face)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Qualified Work Zone Clearances / Offsets from Internal Surfaces */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              3. Work Zone Clearances from Internal Chamber Walls, Floor & Ceiling
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            AMS 2750 Rev H & Nadcap AC7102/8 § 4.2 Mandate (All in {dimUnit})
          </span>
        </div>

        {/* 6 Clearances Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Left Wall Clearance
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={dimUnit === 'mm' ? '10' : '0.5'}
                value={qwzInputs.offsetLeft}
                onChange={(e) => onOffsetInputChange('offsetLeft', e.target.value)}
                onBlur={() => onOffsetInputBlur('offsetLeft')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[11px] text-slate-500 font-mono">
                {dimUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Right Wall Clearance
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={dimUnit === 'mm' ? '10' : '0.5'}
                value={qwzInputs.offsetRight}
                onChange={(e) => onOffsetInputChange('offsetRight', e.target.value)}
                onBlur={() => onOffsetInputBlur('offsetRight')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[11px] text-slate-500 font-mono">
                {dimUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Front Door Clearance
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={dimUnit === 'mm' ? '10' : '0.5'}
                value={qwzInputs.offsetFront}
                onChange={(e) => onOffsetInputChange('offsetFront', e.target.value)}
                onBlur={() => onOffsetInputBlur('offsetFront')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[11px] text-slate-500 font-mono">
                {dimUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Rear Wall Clearance
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={dimUnit === 'mm' ? '10' : '0.5'}
                value={qwzInputs.offsetRear}
                onChange={(e) => onOffsetInputChange('offsetRear', e.target.value)}
                onBlur={() => onOffsetInputBlur('offsetRear')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[11px] text-slate-500 font-mono">
                {dimUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Floor / Hearth Clearance
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={dimUnit === 'mm' ? '10' : '0.5'}
                value={qwzInputs.offsetFloor}
                onChange={(e) => onOffsetInputChange('offsetFloor', e.target.value)}
                onBlur={() => onOffsetInputBlur('offsetFloor')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[11px] text-slate-500 font-mono">
                {dimUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Ceiling / Roof Clearance
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={dimUnit === 'mm' ? '10' : '0.5'}
                value={qwzInputs.offsetCeiling}
                onChange={(e) => onOffsetInputChange('offsetCeiling', e.target.value)}
                onBlur={() => onOffsetInputBlur('offsetCeiling')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[11px] text-slate-500 font-mono">
                {dimUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Auto Center Toggle & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCenter}
              onChange={(e) => setAutoCenter(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-0 focus:outline-none"
            />
            <span>Auto-adjust clearances to keep QWZ centered when chamber dimensions change</span>
          </label>

          <button
            onClick={handleCenterWorkZone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-medium border border-slate-700 cursor-pointer transition-colors"
            title="Recalculate equal front/rear and left/right clearances based on current chamber"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Center QWZ in Chamber Now</span>
          </button>
        </div>
      </div>

      {/* 4. Permanent Furnace Sensors (Control & Overtemperature) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              4. Permanent Furnace Sensors (Control & Overtemperature Thermocouples)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            AMS 2750 Instrumentation Types A–E Spatial Positions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Control Sensor */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span> Control Thermocouple (TC-CTRL)
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Sensor Identifier / Label</label>
              <input
                type="text"
                value={chamber.controlSensorPos?.label ?? 'Roof Center (Control TC)'}
                onChange={(e) =>
                  onUpdateChamber({
                    ...chamber,
                    controlSensorPos: {
                      x: chamber.controlSensorPos?.x ?? Math.round(chamber.length / 2),
                      y: chamber.controlSensorPos?.y ?? chamber.height,
                      z: chamber.controlSensorPos?.z ?? Math.round(chamber.width / 2),
                      label: e.target.value,
                    },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Depth (X)</label>
                <input
                  type="number"
                  value={chamber.controlSensorPos?.x ?? Math.round(chamber.length / 2)}
                  onChange={(e) =>
                    onUpdateChamber({
                      ...chamber,
                      controlSensorPos: {
                        x: parseFloat(e.target.value) || 0,
                        y: chamber.controlSensorPos?.y ?? chamber.height,
                        z: chamber.controlSensorPos?.z ?? Math.round(chamber.width / 2),
                        label: chamber.controlSensorPos?.label ?? 'Control TC',
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Height (Y)</label>
                <input
                  type="number"
                  value={chamber.controlSensorPos?.y ?? chamber.height}
                  onChange={(e) =>
                    onUpdateChamber({
                      ...chamber,
                      controlSensorPos: {
                        x: chamber.controlSensorPos?.x ?? Math.round(chamber.length / 2),
                        y: parseFloat(e.target.value) || 0,
                        z: chamber.controlSensorPos?.z ?? Math.round(chamber.width / 2),
                        label: chamber.controlSensorPos?.label ?? 'Control TC',
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Width (Z)</label>
                <input
                  type="number"
                  value={chamber.controlSensorPos?.z ?? Math.round(chamber.width / 2)}
                  onChange={(e) =>
                    onUpdateChamber({
                      ...chamber,
                      controlSensorPos: {
                        x: chamber.controlSensorPos?.x ?? Math.round(chamber.length / 2),
                        y: chamber.controlSensorPos?.y ?? chamber.height,
                        z: parseFloat(e.target.value) || 0,
                        label: chamber.controlSensorPos?.label ?? 'Control TC',
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Overtemperature Sensor */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span> Overtemperature Limit (TC-OVT)
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Sensor Identifier / Label</label>
              <input
                type="text"
                value={chamber.overtempSensorPos?.label ?? 'Ceiling Limit (Overtemp TC)'}
                onChange={(e) =>
                  onUpdateChamber({
                    ...chamber,
                    overtempSensorPos: {
                      x: chamber.overtempSensorPos?.x ?? Math.round(chamber.length / 2),
                      y: chamber.overtempSensorPos?.y ?? chamber.height,
                      z: chamber.overtempSensorPos?.z ?? Math.round(chamber.width / 4),
                      label: e.target.value,
                    },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Depth (X)</label>
                <input
                  type="number"
                  value={chamber.overtempSensorPos?.x ?? Math.round(chamber.length / 2)}
                  onChange={(e) =>
                    onUpdateChamber({
                      ...chamber,
                      overtempSensorPos: {
                        x: parseFloat(e.target.value) || 0,
                        y: chamber.overtempSensorPos?.y ?? chamber.height,
                        z: chamber.overtempSensorPos?.z ?? Math.round(chamber.width / 4),
                        label: chamber.overtempSensorPos?.label ?? 'Overtemp TC',
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Height (Y)</label>
                <input
                  type="number"
                  value={chamber.overtempSensorPos?.y ?? chamber.height}
                  onChange={(e) =>
                    onUpdateChamber({
                      ...chamber,
                      overtempSensorPos: {
                        x: chamber.overtempSensorPos?.x ?? Math.round(chamber.length / 2),
                        y: parseFloat(e.target.value) || 0,
                        z: chamber.overtempSensorPos?.z ?? Math.round(chamber.width / 4),
                        label: chamber.overtempSensorPos?.label ?? 'Overtemp TC',
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Width (Z)</label>
                <input
                  type="number"
                  value={chamber.overtempSensorPos?.z ?? Math.round(chamber.width / 4)}
                  onChange={(e) =>
                    onUpdateChamber({
                      ...chamber,
                      overtempSensorPos: {
                        x: chamber.overtempSensorPos?.x ?? Math.round(chamber.length / 2),
                        y: chamber.overtempSensorPos?.y ?? chamber.height,
                        z: parseFloat(e.target.value) || 0,
                        label: chamber.overtempSensorPos?.label ?? 'Overtemp TC',
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Geometrical Validation & Enclosure Status */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 lg:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h4 className="font-semibold text-slate-100 text-xs">
              Live Geometrical Feedback & Wire Rigging Dimensions
            </h4>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
            Auto-Updated for {qwz.length}×{qwz.width}×{qwz.height} {dimUnit}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 text-[11px] block">3D Opposite-Corner Diagonal Wire:</span>
            <div className="font-mono font-bold text-white text-sm">
              {diagonal3DLength} {dimUnit}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              √(L² + W² + H²) • Cable cutting length per diagonal
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 text-[11px] block">12 Perimeter Box Wires Total:</span>
            <div className="font-mono font-bold text-cyan-300 text-sm">
              {perimeterWireLength} {dimUnit} ({(perimeterWireLength / (dimUnit === 'mm' ? 1000 : 12)).toFixed(1)} {dimUnit === 'mm' ? 'm' : 'ft'})
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              4×(L + W + H) • Perimeter framework boundary
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 text-[11px] block">Chamber Enclosure Clearance Check:</span>
            <div className="font-mono font-bold text-emerald-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {chamber.length >= qwz.length + qwz.offsetFront + qwz.offsetRear &&
                chamber.width >= qwz.width + qwz.offsetLeft + qwz.offsetRight &&
                chamber.height >= qwz.height + qwz.offsetFloor + qwz.offsetCeiling
                  ? 'Fully Enclosed'
                  : 'Adjust Clearances'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              Min {dimUnit === 'mm' ? '75 mm' : '3 in'} required per AMS 2750H § 3.4.5
            </span>
          </div>
        </div>
      </div>

      {/* 5. Test Equipment & Calibration Register Section */}
      {instrument && onUpdateInstrument && (
        <div className="bg-slate-900/90 border border-cyan-900/40 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <span>5. Test Equipment & Calibration Register</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    AMS 2750 Rev H § 3.2
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Data acquisition recorder calibration status, UKAS/NIST certification, and maximum permissible error.
                </p>
              </div>
            </div>

            {/* Live Calibration Validity Status Badge */}
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                  calStatus === 'valid'
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : calStatus === 'expiring'
                    ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                    : 'bg-red-950/80 border-red-800 text-red-300'
                }`}
              >
                {calStatus === 'valid' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>
                  {calStatus === 'valid'
                    ? `CAL VALID (${daysRemaining} Days)`
                    : calStatus === 'expiring'
                    ? `CAL DUE SOON (${daysRemaining} Days)`
                    : 'CALIBRATION EXPIRED'}
                </span>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('equipment')}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Open full dedicated multi-standard equipment register"
                >
                  <span>Full View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick 1-Click Equipment Presets */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Aerospace Test Instrument Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyInstrumentPreset('yokogawa')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs border border-slate-700 hover:border-cyan-500 font-medium cursor-pointer transition-all"
              >
                Yokogawa DX2030 (UKAS Cal)
              </button>
              <button
                onClick={() => applyInstrumentPreset('eurotherm')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs border border-slate-700 hover:border-emerald-500 font-medium cursor-pointer transition-all"
              >
                Eurotherm Nanodac
              </button>
              <button
                onClick={() => applyInstrumentPreset('fluke')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs border border-slate-700 hover:border-amber-500 font-medium cursor-pointer transition-all"
              >
                Fluke 2638A Hydra Series III
              </button>
              <button
                onClick={() => applyInstrumentPreset('keysight')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs border border-slate-700 hover:border-purple-500 font-medium cursor-pointer transition-all"
              >
                Keysight DAQ970A
              </button>
            </div>
          </div>

          {/* Instrument Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Manufacturer</label>
              <input
                type="text"
                value={instrument.manufacturer}
                onChange={(e) => onUpdateInstrument({ ...instrument, manufacturer: e.target.value })}
                placeholder="e.g. Yokogawa Metrology UK"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Model / Equipment Name</label>
              <input
                type="text"
                value={instrument.model}
                onChange={(e) => onUpdateInstrument({ ...instrument, model: e.target.value })}
                placeholder="e.g. DX2030 Paperless Advanced TUS Recorder"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Serial Number / Asset Tag</label>
              <input
                type="text"
                value={instrument.serialNumber}
                onChange={(e) => onUpdateInstrument({ ...instrument, serialNumber: e.target.value })}
                placeholder="e.g. YK-884920-TUS"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Calibration Certificate #</label>
              <input
                type="text"
                value={instrument.traceabilityNumber}
                onChange={(e) => onUpdateInstrument({ ...instrument, traceabilityNumber: e.target.value })}
                placeholder="e.g. UKAS-CAL-74921-2026"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Calibration Lab & Standard</label>
              <input
                type="text"
                value={instrument.calibrationLab}
                onChange={(e) => onUpdateInstrument({ ...instrument, calibrationLab: e.target.value })}
                placeholder="e.g. Trescal UK Metrology (UKAS Lab #0123)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Max Permissible Error (MPE in {tempUnit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={instrument.maxPermissibleError}
                  onChange={(e) =>
                    onUpdateInstrument({
                      ...instrument,
                      maxPermissibleError: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">
                  {tempUnit} (AMS 2750H max: ±0.6{tempUnit})
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Calibration Date</label>
              <input
                type="date"
                value={instrument.calibrationDate}
                onChange={(e) => onUpdateInstrument({ ...instrument, calibrationDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Calibration Due / Expiry Date</label>
              <input
                type="date"
                value={instrument.calibrationDueDate}
                onChange={(e) => onUpdateInstrument({ ...instrument, calibrationDueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 block mb-0.5">AMS 2750 Rev H Rule:</span>
                Test instrument calibration interval shall not exceed 1 year (or 6 months for portable recorders).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
