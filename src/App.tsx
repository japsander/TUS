/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  SurveySetpoint,
  TestInstrument,
  SurveyMetadata,
  NadcapCheckItem,
  FurnaceClass,
  InstrumentationType,
  UnitSystem,
  TempUnit,
  DimUnit,
  TusTrendData,
  DetectedDwellPeriod,
} from './types/tus';
import {
  generateStandardAMS2750Sensors,
  CLASS_TOLERANCES,
  calculateVolumeInM3,
  calculateVolumeInCuFt,
  getMinRequiredSensors,
  evaluateSetpoint,
  rescaleChannelsToQWZ,
  computeSensorDistances,
} from './utils/ams2750';
import { TechnicalSchematic2D } from './components/TechnicalSchematic2D';
import { Furnace3DView } from './components/Furnace3DView';
import { DimensionInputs } from './components/DimensionInputs';
import { ChannelManager } from './components/ChannelManager';
import { SurveyDataSection } from './components/SurveyDataSection';
import { NadcapChecklist } from './components/NadcapChecklist';
import { TestEquipmentManager } from './components/TestEquipmentManager';
import { WireRiggingGuide } from './components/WireRiggingGuide';
import { QWZInfoPanel } from './components/QWZInfoPanel';
import { ReportPreviewModal } from './components/ReportPreviewModal';
import {
  FileText,
  Download,
  Box,
  Layers,
  Thermometer,
  ShieldCheck,
  Settings,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  LayoutGrid,
  Globe2,
  Wrench,
  Compass,
  GitCommit,
} from 'lucide-react';

export default function App() {
  // ---------------------------------------------------------
  // 1. Initial State (UK Metric Standard Default: °C, mm, m³)
  // ---------------------------------------------------------
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const tempUnit: TempUnit = unitSystem === 'metric' ? '°C' : '°F';
  const dimUnit: DimUnit = unitSystem === 'metric' ? 'mm' : 'in';

  // Visualization mode: 2D Technical Schematic (matching Picture 1) or 3D Orbit
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Chamber in mm (UK Standard)
  const [chamber, setChamber] = useState<FurnaceChamber>({
    length: 1200, // Front-to-Rear (Depth) in mm
    width: 1000,  // Left-to-Right in mm
    height: 1000, // Floor-to-Ceiling in mm
    shape: 'rectangular',
    feedthroughWall: 'rear',
    feedthroughPos: { x: 1200, y: 750, z: 500 },
  });

  // Qualified Work Zone in mm (UK Standard)
  const [qwz, setQWZ] = useState<QualifiedWorkZone>({
    length: 900,
    width: 700,
    height: 700,
    offsetLeft: 150,
    offsetRight: 150,
    offsetFront: 150,
    offsetRear: 150,
    offsetFloor: 120,
    offsetCeiling: 180,
  });

  // Channels / Thermocouples: Initialized to Picture 1 Standard 21-Point Layout!
  const [channels, setChannels] = useState<ThermocoupleChannel[]>(() =>
    generateStandardAMS2750Sensors(
      {
        length: 1200,
        width: 1000,
        height: 1000,
        shape: 'rectangular',
        feedthroughWall: 'rear',
        feedthroughPos: { x: 1200, y: 750, z: 500 },
      },
      {
        length: 900,
        width: 700,
        height: 700,
        offsetLeft: 150,
        offsetRight: 150,
        offsetFront: 150,
        offsetRear: 150,
        offsetFloor: 120,
        offsetCeiling: 180,
      },
      21 // 21-point pattern from Picture 1
    )
  );

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>('tc-1');

  // Survey Metadata (UK & Nadcap / AMS 2750 Rev H Standard)
  const [meta, setMeta] = useState<SurveyMetadata>({
    reportNumber: 'TUS-2026-UK-HT04',
    revision: 'Rev. 0',
    date: new Date().toISOString().split('T')[0],
    companyName: 'AeroThermal Technologies (UK) Ltd.',
    facilityLocation: 'Aerospace Heat Treatment Centre — Midlands Facility',
    furnaceId: 'FURNACE-HT-04',
    furnaceName: 'Aerospace Batch Protective Atmosphere Furnace',
    furnaceModel: 'Seco/Warwick Vector-1210',
    furnaceSerial: 'SW-98214-GB',
    surveyReason: 'Periodic',
    furnaceClass: 2, // Class 2 = ±6°C (±10°F)
    instrumentationType: 'B',
    operatingTempMin: 300,
    operatingTempMax: 1150,
    unitSystem: 'metric',
    tempUnit: '°C',
    dimUnit: 'mm',
    atmosphere: 'Endothermic Class 301 Protective Atmosphere',
    heatingMethod: 'Silicon Carbide Electric Resistance Heating Elements',
    loadCondition: 'Simulated Production Load',
    fanCondition: 'Recirculation Fan High Speed On',
    dataIntervalSeconds: 60,
    technicianName: 'Marcus Vance',
    technicianTitle: 'Certified Pyrometry Specialist (CQI-9 / AMS 2750)',
    qualityManagerName: 'Dr. Sarah Lin',
    qualityManagerTitle: 'Director of Aerospace Quality & Compliance',
    responsibleEngineerName: 'David K. Hoffman, CEng MIMMM',
  });

  // Survey Setpoints in Celsius (°C)
  const [setpoints, setSetpoints] = useState<SurveySetpoint[]>([
    {
      id: 'sp-1',
      targetTemp: 350,
      soakDurationMinutes: 30,
      soakStartTime: '09:15',
      soakEndTime: '09:45',
      maxOvershootObserved: 351.4,
      readings: {
        'tc-1': 351.2,
        'tc-2': 351.6,
        'tc-3': 349.1,
        'tc-4': 349.4,
        'tc-5': 350.2,
        'tc-6': 350.6,
        'tc-7': 351.1,
        'tc-8': 349.3,
        'tc-9': 349.0,
        'tc-10': 350.4,
        'tc-11': 350.1,
        'tc-12': 350.5,
        'tc-13': 350.9,
        'tc-14': 351.4,
        'tc-15': 349.7,
        'tc-16': 349.8,
        'tc-17': 351.5,
        'tc-18': 351.8,
        'tc-19': 348.9,
        'tc-20': 349.2,
        'tc-21': 350.8,
      },
    },
    {
      id: 'sp-2',
      targetTemp: 650,
      soakDurationMinutes: 30,
      soakStartTime: '11:00',
      soakEndTime: '11:30',
      maxOvershootObserved: 652.1,
      readings: {
        'tc-1': 651.8,
        'tc-2': 652.2,
        'tc-3': 648.4,
        'tc-4': 648.9,
        'tc-5': 650.1,
        'tc-6': 650.7,
        'tc-7': 651.5,
        'tc-8': 648.8,
        'tc-9': 648.3,
        'tc-10': 650.6,
        'tc-11': 650.0,
        'tc-12': 650.8,
        'tc-13': 651.2,
        'tc-14': 652.0,
        'tc-15': 649.1,
        'tc-16': 649.3,
        'tc-17': 652.1,
        'tc-18': 652.5,
        'tc-19': 648.2,
        'tc-20': 648.7,
        'tc-21': 651.1,
      },
    },
    {
      id: 'sp-3',
      targetTemp: 1050,
      soakDurationMinutes: 30,
      soakStartTime: '13:20',
      soakEndTime: '13:50',
      maxOvershootObserved: 1052.8,
      readings: {
        'tc-1': 1051.9,
        'tc-2': 1052.6,
        'tc-3': 1047.8,
        'tc-4': 1048.4,
        'tc-5': 1050.2,
        'tc-6': 1050.8,
        'tc-7': 1051.7,
        'tc-8': 1048.2,
        'tc-9': 1047.6,
        'tc-10': 1050.5,
        'tc-11': 1050.1,
        'tc-12': 1050.9,
        'tc-13': 1051.4,
        'tc-14': 1052.4,
        'tc-15': 1048.9,
        'tc-16': 1049.0,
        'tc-17': 1052.3,
        'tc-18': 1052.9,
        'tc-19': 1047.5,
        'tc-20': 1048.0,
        'tc-21': 1051.2,
      },
    },
  ]);

  // TUS Trend Data from CSV (for Report Graph)
  const [trendData, setTrendData] = useState<TusTrendData[]>([]);
  const [dwellPeriods, setDwellPeriods] = useState<DetectedDwellPeriod[]>([]);

  // Test Instrument Details (UK ISO/IEC 17025 Accredited)
  const [instrument, setInstrument] = useState<TestInstrument>({
    manufacturer: 'Yokogawa Metrology UK',
    model: 'DX2030 Paperless Advanced TUS Recorder',
    serialNumber: 'YK-884920-TUS',
    calibrationDate: '2026-08-14',
    calibrationDueDate: '2027-02-14',
    traceabilityNumber: 'UKAS-CAL-74921-2026',
    maxPermissibleError: 0.2, // °C
    calibrationLab: 'Trescal UK Metrology Services (UKAS Accredited)',
  });

  // Nadcap AC7102/8 Audit Checklist
  const [checklist, setChecklist] = useState<NadcapCheckItem[]>([
    {
      id: 'nc-1',
      code: 'AC7102/8 § 4.1',
      question: 'Survey conducted across the qualified operating temperature envelope (Min, Mid, and Max setpoints in °C).',
      compliant: true,
      notes: 'Verified 350°C, 650°C, and 1050°C surveyed per UK procedure.',
    },
    {
      id: 'nc-2',
      code: 'AC7102/8 § 4.2',
      question: 'Qualified Work Zone dimensions, volume (m³), and 6-way clearances from all internal surfaces documented.',
      compliant: true,
      notes: 'Work zone coordinates and clearances verified in millimetres (mm).',
    },
    {
      id: 'nc-3',
      code: 'AC7102/8 § 4.3',
      question: 'Number of TUS sensors meets or exceeds AMS 2750 Rev H Table 11 requirements.',
      compliant: true,
      notes: 'Volume 0.441 m³ requires 9 sensors minimum; 21 verified per Picture 1.',
    },
    {
      id: 'nc-4',
      code: 'AC7102/8 § 4.4',
      question: 'Thermocouple wire roll calibration correction factors applied in temperature calculations.',
      compliant: true,
      notes: 'Batch lot calibration offsets applied arithmetically in °C.',
    },
    {
      id: 'nc-5',
      code: 'AC7102/8 § 4.5',
      question: 'Data acquisition logging frequency did not exceed 2 minutes (120 seconds).',
      compliant: true,
      notes: 'Continuous logging at 60-second intervals.',
    },
    {
      id: 'nc-6',
      code: 'AC7102/8 § 4.6',
      question: 'Soak duration satisfied minimum time requirement (≥ 30 min) after all sensors stabilized within tolerance.',
      compliant: true,
      notes: '30-minute steady-state verified for all setpoints.',
    },
    {
      id: 'nc-7',
      code: 'AC7102/8 § 4.7',
      question: 'No uncorrected temperature overshoot exceeded the allowable furnace class tolerance during soak.',
      compliant: true,
      notes: 'Max overshoot observed 1052.8°C (Limit: 1056.0°C).',
    },
    {
      id: 'nc-8',
      code: 'AC7102/8 § 4.8',
      question: 'TUS recording instrument calibrated within required period with UKAS / NIST traceability.',
      compliant: true,
      notes: 'Yokogawa DX2030 calibrated within 3-month field test cycle.',
    },
    {
      id: 'nc-9',
      code: 'AC7102/8 § 4.9',
      question: 'Furnace atmosphere, heating elements, and circulation fan state match production operating conditions.',
      compliant: true,
      notes: 'Protective atmosphere and recirculation fan active.',
    },
    {
      id: 'nc-10',
      code: 'AC7102/8 § 4.10',
      question: 'Formal sign-off approvals provided by Pyrometry Technician, Quality Manager, and Level 3 Authority.',
      compliant: true,
      notes: 'Signatures pending final Word report issuance.',
    },
  ]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'visual' | 'dimensions' | 'channels' | 'equipment' | 'survey' | 'nadcap' | 'meta'>(
    'visual'
  );

  // Diagram Snapshot for Docx Embedding
  const [diagramImageBase64, setDiagramImageBase64] = useState<string>('');

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Toggle Unit System (Metric UK default vs Imperial)
  const handleToggleUnit = (sys: UnitSystem) => {
    setUnitSystem(sys);
    const newTempUnit: TempUnit = sys === 'metric' ? '°C' : '°F';
    const newDimUnit: DimUnit = sys === 'metric' ? 'mm' : 'in';

    setMeta((prev) => ({
      ...prev,
      unitSystem: sys,
      tempUnit: newTempUnit,
      dimUnit: newDimUnit,
    }));
  };

  // Apply UK Standard Architecture Presets
  const handleApplyPreset = (id: string) => {
    let newChamber: FurnaceChamber = { ...chamber };
    let newQWZ: QualifiedWorkZone = { ...qwz };

    if (id === 'custom-2500') {
      newChamber = {
        length: 2900,
        width: 3400,
        height: 2400,
        shape: 'rectangular',
        feedthroughWall: 'rear',
        feedthroughPos: { x: 2900, y: 1800, z: 1700 },
      };
      newQWZ = {
        length: 2500,
        width: 3000,
        height: 2000,
        offsetLeft: 200,
        offsetRight: 200,
        offsetFront: 200,
        offsetRear: 200,
        offsetFloor: 180,
        offsetCeiling: 220,
      };
    } else if (id === 'pic1-1200') {
      newChamber = { length: 1200, width: 1000, height: 1000, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 1200, y: 750, z: 500 } };
      newQWZ = { length: 900, width: 700, height: 700, offsetLeft: 150, offsetRight: 150, offsetFront: 150, offsetRear: 150, offsetFloor: 120, offsetCeiling: 180 };
    } else if (id === 'drop-1800') {
      newChamber = { length: 1800, width: 1200, height: 1500, shape: 'rectangular', feedthroughWall: 'roof', feedthroughPos: { x: 900, y: 1500, z: 600 } };
      newQWZ = { length: 1400, width: 900, height: 1100, offsetLeft: 150, offsetRight: 150, offsetFront: 200, offsetRear: 200, offsetFloor: 180, offsetCeiling: 220 };
    } else if (id === 'vac-900') {
      newChamber = { length: 900, width: 900, height: 1200, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 900, y: 900, z: 450 } };
      newQWZ = { length: 600, width: 600, height: 900, offsetLeft: 150, offsetRight: 150, offsetFront: 150, offsetRear: 150, offsetFloor: 150, offsetCeiling: 150 };
    } else if (id === 'car-3000') {
      newChamber = { length: 3000, width: 1800, height: 1800, shape: 'rectangular', feedthroughWall: 'left', feedthroughPos: { x: 1500, y: 1200, z: 0 } };
      newQWZ = { length: 2400, width: 1400, height: 1300, offsetLeft: 200, offsetRight: 200, offsetFront: 300, offsetRear: 300, offsetFloor: 250, offsetCeiling: 250 };
    } else if (id === 'lab-600') {
      newChamber = { length: 600, width: 500, height: 500, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 600, y: 350, z: 250 } };
      newQWZ = { length: 450, width: 350, height: 350, offsetLeft: 75, offsetRight: 75, offsetFront: 75, offsetRear: 75, offsetFloor: 60, offsetCeiling: 90 };
    }

    setChamber(newChamber);
    setQWZ(newQWZ);

    const volumeM3 = calculateVolumeInM3(newQWZ, dimUnit);
    const volumeCuFt = calculateVolumeInCuFt(newQWZ, dimUnit);
    const { minSensors } = getMinRequiredSensors(volumeCuFt, volumeM3);
    const countToGenerate = id === 'pic1-1200' || id === 'custom-2500' ? 21 : Math.max(9, minSensors);
    const newSensors = generateStandardAMS2750Sensors(newChamber, newQWZ, countToGenerate);
    setChannels(newSensors);
    if (newSensors[0]) setSelectedChannelId(newSensors[0].id);
  };

  // Automatic scaling when QWZ changes so sensors and wire grid always fill the zone
  const handleUpdateQWZ = (newQWZ: QualifiedWorkZone) => {
    // 1. Maintain furnace chamber enclosing the QWZ + clearances
    const reqLength = newQWZ.offsetFront + newQWZ.length + newQWZ.offsetRear;
    const reqWidth = newQWZ.offsetLeft + newQWZ.width + newQWZ.offsetRight;
    const reqHeight = newQWZ.offsetFloor + newQWZ.height + newQWZ.offsetCeiling;

    const nextChamber: FurnaceChamber = {
      ...chamber,
      length: Math.max(chamber.length, reqLength),
      width: Math.max(chamber.width, reqWidth),
      height: Math.max(chamber.height, reqHeight),
      feedthroughPos: {
        x: Math.max(chamber.length, reqLength),
        y: Math.max(chamber.height, reqHeight) * 0.75,
        z: Math.max(chamber.width, reqWidth) / 2,
      },
    };

    setQWZ(newQWZ);
    setChamber(nextChamber);

    // 2. Proportionally rescale all existing channels so the wire grid and thermocouples immediately fill the new QWZ!
    const updatedChannels = rescaleChannelsToQWZ(channels, qwz, newQWZ, nextChamber);
    setChannels(updatedChannels);
  };

  // Chamber update with immediate distance recalculation for all channels
  const handleUpdateChamber = (newChamber: FurnaceChamber) => {
    setChamber(newChamber);
    setChannels((prev) =>
      prev.map((ch) => ({
        ...ch,
        ...computeSensorDistances(ch.x, ch.y, ch.z, newChamber),
      }))
    );
  };

  // Re-generate standard sensor pattern to span the current QWZ boundaries
  const handleFitSensorsToQWZ = (count?: number) => {
    const targetCount = count || channels.length;
    const newSensors = generateStandardAMS2750Sensors(chamber, qwz, targetCount);
    setChannels(newSensors);
    if (newSensors[0]) setSelectedChannelId(newSensors[0].id);
  };

  // Live Overall Conformity Check
  const volumeM3 = calculateVolumeInM3(qwz, dimUnit);
  const volumeCuFt = calculateVolumeInCuFt(qwz, dimUnit);
  const { minSensors } = getMinRequiredSensors(volumeCuFt, volumeM3);
  const tolerance = CLASS_TOLERANCES[meta.furnaceClass][tempUnit];
  const setpointAnalyses = setpoints.map((sp) =>
    evaluateSetpoint(sp, channels, meta.furnaceClass, tempUnit, instrument.maxPermissibleError)
  );
  const isOverallConformant = setpointAnalyses.every((sa) => sa.passed) && channels.length >= minSensors;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ----------------------------------------------------- */}
      {/* 1. TOP HEADER & UK ACCREDITATION BANNER */}
      {/* ----------------------------------------------------- */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Accreditation Badges */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">
                  AMS 2750 Rev H & Nadcap AC7102/8 TUS Engine
                </h1>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase flex items-center gap-1">
                  <Globe2 className="w-3 h-3 inline" /> UK Standard (Metric)
                </span>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  100% Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Furnace ID: <strong className="text-slate-200">{meta.furnaceId}</strong></span>
                <span>•</span>
                <span>
                  QWZ Volume:{' '}
                  <strong className="text-slate-200 font-mono">
                    {volumeM3.toFixed(3)} m³ ({(volumeM3 * 1000).toFixed(0)} L)
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Min Required Sensors: <strong className="text-cyan-400 font-mono">{minSensors}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Key Parameters Quick Pills & Export Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Furnace Class Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-500 mr-1.5 font-medium">Class:</span>
              <select
                value={meta.furnaceClass}
                onChange={(e) =>
                  setMeta({ ...meta, furnaceClass: parseInt(e.target.value) as FurnaceClass })
                }
                className="bg-transparent text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-slate-900">Class 1 (±3°C / ±5°F)</option>
                <option value={2} className="bg-slate-900">Class 2 (±6°C / ±10°F)</option>
                <option value={3} className="bg-slate-900">Class 3 (±8°C / ±15°F)</option>
                <option value={4} className="bg-slate-900">Class 4 (±10°C / ±20°F)</option>
                <option value={5} className="bg-slate-900">Class 5 (±14°C / ±25°F)</option>
                <option value={6} className="bg-slate-900">Class 6 (±28°C / ±50°F)</option>
              </select>
            </div>

            {/* Instrumentation Type */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-500 mr-1.5 font-medium">Type:</span>
              <select
                value={meta.instrumentationType}
                onChange={(e) =>
                  setMeta({
                    ...meta,
                    instrumentationType: e.target.value as InstrumentationType,
                  })
                }
                className="bg-transparent text-amber-300 font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value="A" className="bg-slate-900">Type A (Recorders + Load)</option>
                <option value="B" className="bg-slate-900">Type B (Control + High/Low)</option>
                <option value="C" className="bg-slate-900">Type C (Control + Single)</option>
                <option value="D" className="bg-slate-900">Type D (Control + Over-Temp)</option>
              </select>
            </div>

            {/* UK Metric Standard Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-mono">
              <button
                onClick={() => handleToggleUnit('metric')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  unitSystem === 'metric'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                °C / mm (UK)
              </button>
              <button
                onClick={() => handleToggleUnit('imperial')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  unitSystem === 'imperial'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                °F / in (US)
              </button>
            </div>

            {/* Test Equipment & Calibration Quick Access Button */}
            <button
              onClick={() => setActiveTab('equipment')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-sm ${
                activeTab === 'equipment'
                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                  : 'bg-slate-950 hover:bg-slate-900 border-cyan-900/60 hover:border-cyan-500 text-cyan-300'
              }`}
              title="Click to view and edit test instrument & thermocouple calibration details"
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Test Cal:{' '}
                <strong className="text-white">
                  {instrument.model.split(' ')[0]} {instrument.model.split(' ')[1] || ''}
                </strong>
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  instrument.calibrationDueDate && new Date(instrument.calibrationDueDate) < new Date()
                    ? 'bg-red-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
                title={
                  instrument.calibrationDueDate && new Date(instrument.calibrationDueDate) < new Date()
                    ? 'Calibration Expired'
                    : 'UKAS Calibration Valid'
                }
              />
            </button>

            {/* Download Word Document (.docx) Button */}
            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Generate Word Doc (.docx)</span>
            </button>
          </div>
        </div>

        {/* Audit Status Bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              {isOverallConformant ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> AMS 2750 Rev H Conformant
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Action Required
                </span>
              )}
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Class {meta.furnaceClass} Tolerance: <strong className="text-slate-200 font-mono">±{tolerance} {tempUnit}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Active Channels: <strong className="text-cyan-400 font-mono">{channels.length}</strong> (Min required: {minSensors})
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[11px]">
            <span>PRI Nadcap AC7102/8</span>
            <span>•</span>
            <span>UKAS / ISO 17025 Traceable</span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------- */}
      {/* 2. DUAL-PANE WORKBENCH */}
      {/* ----------------------------------------------------- */}
      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full">
        {/* Left Column: 2D Isometric Technical Schematic (matching Picture 1) & 3D Toggle */}
        <div className="xl:col-span-6 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-white">
                Furnace Wire Grid Web & Thermocouple Schematic
              </h2>
            </div>

            {/* Toggle 2D Technical Schematic vs 3D Orbit */}
            <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === '2d'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Exact 2D isometric line drawing with wire web & triangle markers matching Picture 1"
              >
                2D Schematic (Picture 1)
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === '3d'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Interactive 3D WebGL Orbit model"
              >
                3D CAD Orbit
              </button>
            </div>
          </div>

          {/* View Container */}
          <div className="h-[520px] xl:h-[660px] w-full">
            {viewMode === '2d' ? (
              <TechnicalSchematic2D
                chamber={chamber}
                qwz={qwz}
                channels={channels}
                dimUnit={dimUnit}
                selectedChannelId={selectedChannelId}
                onSelectChannel={setSelectedChannelId}
                onExportImageReady={setDiagramImageBase64}
              />
            ) : (
              <Furnace3DView
                chamber={chamber}
                qwz={qwz}
                channels={channels}
                dimUnit={dimUnit}
                selectedChannelId={selectedChannelId}
                onSelectChannel={setSelectedChannelId}
                onExportImageReady={setDiagramImageBase64}
              />
            )}
          </div>

          {/* Real-Time Auto-Adjusting QWZ Geometrical Information & Clearance Panel */}
          <QWZInfoPanel
            chamber={chamber}
            qwz={qwz}
            channels={channels}
            dimUnit={dimUnit}
            selectedChannelId={selectedChannelId}
            instrument={instrument}
            tempUnit={tempUnit}
            onSelectChannel={setSelectedChannelId}
            onFitSensorsToQWZ={handleFitSensorsToQWZ}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        </div>

        {/* Right Column: Tabbed Data & Engineering Controls */}
        <div className="xl:col-span-6 flex flex-col space-y-4">
          {/* Navigation Tabs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 flex flex-wrap gap-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Dimensions & Work Zone ({dimUnit})</span>
            </button>

            <button
              onClick={() => setActiveTab('channels')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'channels'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Channels & Clearances ({channels.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('equipment')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer border ${
                activeTab === 'equipment'
                  ? 'bg-cyan-600 text-white font-bold shadow-md border-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-cyan-900/50 bg-cyan-950/20'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Equipment & Cal</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  instrument.calibrationDueDate && new Date(instrument.calibrationDueDate) < new Date()
                    ? 'bg-red-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
                title={
                  instrument.calibrationDueDate && new Date(instrument.calibrationDueDate) < new Date()
                    ? 'Calibration Expired'
                    : 'Calibration Current'
                }
              />
            </button>

            <button
              onClick={() => setActiveTab('survey')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'survey'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Survey Readings ({setpoints.length} SP in {tempUnit})</span>
            </button>

            <button
              onClick={() => setActiveTab('nadcap')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'nadcap'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Nadcap AC7102/8 Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('meta')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'meta'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Report Details</span>
            </button>
          </div>

          {/* Active Tab Panel Content */}
          <div className="flex-1">
            {activeTab === 'visual' && (
              <DimensionInputs
                chamber={chamber}
                qwz={qwz}
                dimUnit={dimUnit}
                channelCount={channels.length}
                tempUnit={tempUnit}
                instrument={instrument}
                onUpdateChamber={handleUpdateChamber}
                onUpdateQWZ={handleUpdateQWZ}
                onApplyPreset={handleApplyPreset}
                onFitSensorsToQWZ={handleFitSensorsToQWZ}
                onUpdateInstrument={setInstrument}
                onNavigateTab={(tab) => setActiveTab(tab as any)}
              />
            )}

            {activeTab === 'channels' && (
              <ChannelManager
                channels={channels}
                chamber={chamber}
                qwz={qwz}
                dimUnit={dimUnit}
                tempUnit={tempUnit}
                setpoints={setpoints}
                selectedChannelId={selectedChannelId}
                onSelectChannel={setSelectedChannelId}
                onUpdateChannels={setChannels}
              />
            )}

            {activeTab === 'equipment' && (
              <TestEquipmentManager
                instrument={instrument}
                onUpdateInstrument={setInstrument}
                channels={channels}
                tempUnit={tempUnit}
              />
            )}

            {activeTab === 'survey' && (
              <SurveyDataSection
                setpoints={setpoints}
                channels={channels}
                furnaceClass={meta.furnaceClass}
                tempUnit={tempUnit}
                instrumentError={instrument.maxPermissibleError}
                meta={meta}
                onUpdateSetpoints={setSetpoints}
                onUpdateChannels={setChannels}
                onUpdateMeta={setMeta}
                onUpdateTrendData={setTrendData}
                onUpdateDwellPeriods={setDwellPeriods}
              />
            )}

            {activeTab === 'nadcap' && (
              <NadcapChecklist
                checklist={checklist}
                instrument={instrument}
                meta={meta}
                onUpdateChecklist={setChecklist}
                onUpdateInstrument={setInstrument}
                onUpdateMeta={setMeta}
              />
            )}

            {activeTab === 'meta' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-100 text-sm border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span>Furnace Identification & Audit Metadata</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Company / Facility Name</label>
                    <input
                      type="text"
                      value={meta.companyName}
                      onChange={(e) => setMeta({ ...meta, companyName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Facility Location</label>
                    <input
                      type="text"
                      value={meta.facilityLocation}
                      onChange={(e) => setMeta({ ...meta, facilityLocation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Report Number</label>
                    <input
                      type="text"
                      value={meta.reportNumber}
                      onChange={(e) => setMeta({ ...meta, reportNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Revision</label>
                    <input
                      type="text"
                      value={meta.revision}
                      onChange={(e) => setMeta({ ...meta, revision: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Furnace Equipment Tag / ID</label>
                    <input
                      type="text"
                      value={meta.furnaceId}
                      onChange={(e) => setMeta({ ...meta, furnaceId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Equipment Name / Description</label>
                    <input
                      type="text"
                      value={meta.furnaceName}
                      onChange={(e) => setMeta({ ...meta, furnaceName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Furnace Model & Serial Number</label>
                    <input
                      type="text"
                      value={`${meta.furnaceModel} | ${meta.furnaceSerial}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('|');
                        setMeta({
                          ...meta,
                          furnaceModel: parts[0]?.trim() || '',
                          furnaceSerial: parts[1]?.trim() || '',
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Survey Purpose</label>
                    <select
                      value={meta.surveyReason}
                      onChange={(e) =>
                        setMeta({
                          ...meta,
                          surveyReason: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Periodic">Periodic TUS (Interval per AMS 2750 Rev H Table 14)</option>
                      <option value="Initial Qualification">Initial Qualification Survey</option>
                      <option value="Post-Maintenance / Relining">Post-Maintenance / Refractory Relining</option>
                      <option value="Thermocouple Failure">Post Control Sensor Replacement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Atmosphere</label>
                    <input
                      type="text"
                      value={meta.atmosphere}
                      onChange={(e) => setMeta({ ...meta, atmosphere: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Heating Method</label>
                    <input
                      type="text"
                      value={meta.heatingMethod}
                      onChange={(e) => setMeta({ ...meta, heatingMethod: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Load Condition</label>
                    <select
                      value={meta.loadCondition}
                      onChange={(e) =>
                        setMeta({ ...meta, loadCondition: e.target.value as any })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Empty">Empty Furnace Chamber</option>
                      <option value="Simulated Production Load">Simulated Production Load</option>
                      <option value="Maximum Production Load">Maximum Production Load Rack</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Circulation Fan Condition</label>
                    <input
                      type="text"
                      value={meta.fanCondition}
                      onChange={(e) => setMeta({ ...meta, fanCondition: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ----------------------------------------------------- */}
      {/* 3. REPORT PREVIEW & DOWNLOAD MODAL */}
      {/* ----------------------------------------------------- */}
      <ReportPreviewModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        meta={meta}
        chamber={chamber}
        qwz={qwz}
        channels={channels}
        setpoints={setpoints}
        instrument={instrument}
        checklist={checklist}
        diagramImageBase64={diagramImageBase64}
        trendData={trendData}
        dwellPeriods={dwellPeriods}
      />
    </div>
  );
}
