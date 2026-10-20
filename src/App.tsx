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
import { getTusIntervalInfo, calculateNextTusDueDate } from './utils/tusCompliance';
import {
  generateStandardAMS2750Sensors,
  CLASS_TOLERANCES,
  calculateVolumeInM3,
  calculateVolumeInCuFt,
  getMinRequiredSensors,
  evaluateSetpoint,
  rescaleChannelsToQWZ,
  computeSensorDistances,
  balanceSensors,
} from './utils/ams2750';
import { TechnicalSchematic2D } from './components/TechnicalSchematic2D';
import { DimensionInputs, ChamberPreset } from './components/DimensionInputs';
import { ChannelManager } from './components/ChannelManager';
import { SurveyDataSection } from './components/SurveyDataSection';
import { NadcapChecklist } from './components/NadcapChecklist';
import { TestEquipmentManager } from './components/TestEquipmentManager';
import { WireRiggingGuide } from './components/WireRiggingGuide';
import { QWZInfoPanel } from './components/QWZInfoPanel';
import { ReportPreviewModal } from './components/ReportPreviewModal';
import { InstructionManual } from './components/InstructionManual';
import {
  FileText,
  Download,
  Upload,
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
  Calendar,
  Plus,
  Trash2,
  BookOpen,
  Save,
  FolderOpen,
} from 'lucide-react';

export default function App() {
  // ---------------------------------------------------------
  // 1. Initial State (UK Metric Standard Default: °C, mm, m³)
  // ---------------------------------------------------------
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const tempUnit: TempUnit = unitSystem === 'metric' ? '°C' : '°F';
  const dimUnit: DimUnit = unitSystem === 'metric' ? 'mm' : 'in';


  // Chamber in mm (UK Standard)
  const [chamber, setChamber] = useState<FurnaceChamber>({
    length: 0,
    width: 0,
    height: 0,
    shape: 'rectangular',
    feedthroughWall: 'rear',
    feedthroughPos: { x: 0, y: 0, z: 0 },
    controlSensorPos: { x: 0, y: 0, z: 0, label: 'Roof Center (Control TC)' },
    overtempSensorPos: { x: 0, y: 0, z: 0, label: 'Ceiling Limit (Overtemp TC)' },
  });

  // Qualified Work Zone in mm (UK Standard)
  const [qwz, setQWZ] = useState<QualifiedWorkZone>({
    length: 0,
    width: 0,
    height: 0,
    offsetLeft: 0,
    offsetRight: 0,
    offsetFront: 0,
    offsetRear: 0,
    offsetFloor: 0,
    offsetCeiling: 0,
  });

  // Channels / Thermocouples: Empty by default until a Furnace Architecture Preset is selected
  const [channels, setChannels] = useState<ThermocoupleChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Survey Metadata (UK & Nadcap / AMS 2750 Rev H Standard)
  const [meta, setMeta] = useState<SurveyMetadata>({
    reportNumber: '',
    revision: '',
    date: new Date().toISOString().split('T')[0],
    companyName: '',
    facilityLocation: '',
    furnaceId: '',
    furnaceName: '',
    furnaceModel: '',
    furnaceSerial: '',
    surveyReason: 'Periodic',
    furnaceClass: 2,
    instrumentationType: 'B',
    furnaceApplication: 'Parts',
    operatingTempMin: 300,
    operatingTempMax: 1100,
    unitSystem: 'metric',
    tempUnit: '°C',
    dimUnit: 'mm',
    atmosphere: '',
    heatingMethod: '',
    loadCondition: 'Simulated Production Load',
    fanCondition: '',
    dataIntervalSeconds: 0,
    technicianName: '',
    technicianTitle: '',
    qualityManagerName: '',
    qualityManagerTitle: '',
    responsibleEngineerName: '',
  });

  // Survey Setpoints in Celsius (°C)
  const [setpoints, setSetpoints] = useState<SurveySetpoint[]>([]);

  // TUS Trend Data from CSV (for Report Graph)
  const [trendData, setTrendData] = useState<TusTrendData[]>([]);
  const [dwellPeriods, setDwellPeriods] = useState<DetectedDwellPeriod[]>([]);

  // TUS Compliance
  const [isExtendedInterval, setIsExtendedInterval] = useState(false);

  // Furnace Presets State
  const [furnacePresets, setFurnacePresets] = useState<Array<{ id: string; name: string; meta: Partial<SurveyMetadata>; chamber: FurnaceChamber; qwz: QualifiedWorkZone }>>(() => {
    try {
      const saved = localStorage.getItem('tus_furnace_presets_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [selectedFurnacePresetId, setSelectedFurnacePresetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('tus_furnace_presets_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch (e) {}
    return '';
  });
  const [newFurnacePresetName, setNewFurnacePresetName] = useState('');

  const saveFurnacePresets = (updated: typeof furnacePresets) => {
    setFurnacePresets(updated);
    try {
      localStorage.setItem('tus_furnace_presets_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSaveCurrentAsFurnacePreset = () => {
    const name = newFurnacePresetName.trim() || `Furnace ${meta.furnaceId || 'Custom'}`;
    const newPreset = {
      id: `furnace-${Date.now()}`,
      name,
      meta,
      chamber,
      qwz,
    };
    saveFurnacePresets([...furnacePresets, newPreset]);
    setSelectedFurnacePresetId(newPreset.id);
    setNewFurnacePresetName('');
  };

  const handleRenameFurnacePreset = (id: string) => {
    if (!id) return;
    const preset = furnacePresets.find(p => p.id === id);
    if (!preset) return;
    const newName = prompt('Enter new name for furnace preset:', preset.name);
    if (!newName || !newName.trim()) return;
    const updated = furnacePresets.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
    saveFurnacePresets(updated);
  };

  const handleDeleteFurnacePreset = (id: string) => {
    if (!id) return;
    const updated = furnacePresets.filter(p => p.id !== id);
    saveFurnacePresets(updated);
    if (selectedFurnacePresetId === id) {
      if (updated.length > 0) {
        setSelectedFurnacePresetId(updated[0].id);
        setMeta(prev => ({ ...prev, ...updated[0].meta }));
        setChamber(updated[0].chamber);
        setQWZ(updated[0].qwz);
      } else {
        setSelectedFurnacePresetId('');
      }
    }
  };

  const handleSelectFurnacePreset = (id: string) => {
    setSelectedFurnacePresetId(id);
    const preset = furnacePresets.find(p => p.id === id);
    if (preset) {
      setMeta(prev => ({ ...prev, ...preset.meta }));
      setChamber(preset.chamber);
      setQWZ(preset.qwz);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportAllPresets = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      furnacePresets,
      chamberPresets,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pyrometry_presets_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportAllPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.furnacePresets && Array.isArray(parsed.furnacePresets)) {
            setFurnacePresets(parsed.furnacePresets);
            localStorage.setItem('tus_furnace_presets_v1', JSON.stringify(parsed.furnacePresets));
            if (parsed.furnacePresets.length > 0 && !selectedFurnacePresetId) {
              setSelectedFurnacePresetId(parsed.furnacePresets[0].id);
            }
          }
          if (parsed.chamberPresets && Array.isArray(parsed.chamberPresets)) {
            setChamberPresets(parsed.chamberPresets);
            localStorage.setItem('tus_chamber_presets_v1', JSON.stringify(parsed.chamberPresets));
          }
          alert('Presets imported successfully!');
        } catch (err) {
          alert('Error parsing preset JSON file.');
        }
      };
    }
  };

  const settingsFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportAllSettings = () => {
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      meta,
      chamber,
      qwz,
      channels,
      setpoints,
      instrument,
      furnacePresets,
      chamberPresets,
      dimUnit,
      tempUnit,
      trendData,
      dwellPeriods,
      checklist,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tus_complete_settings_${meta.furnaceId || 'survey'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportAllSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.meta) setMeta(parsed.meta);
          if (parsed.chamber) setChamber(parsed.chamber);
          if (parsed.qwz) setQWZ(parsed.qwz);
          if (parsed.channels && Array.isArray(parsed.channels)) setChannels(parsed.channels);
          if (parsed.setpoints && Array.isArray(parsed.setpoints)) setSetpoints(parsed.setpoints);
          if (parsed.instrument) setInstrument(parsed.instrument);
          if (parsed.furnacePresets && Array.isArray(parsed.furnacePresets)) {
            setFurnacePresets(parsed.furnacePresets);
            localStorage.setItem('tus_furnace_presets_v1', JSON.stringify(parsed.furnacePresets));
          }
          if (parsed.chamberPresets && Array.isArray(parsed.chamberPresets)) {
            setChamberPresets(parsed.chamberPresets);
            localStorage.setItem('tus_chamber_presets_v1', JSON.stringify(parsed.chamberPresets));
          }
          if (parsed.tempUnit === '°F' || parsed.dimUnit === 'in' || parsed.unitSystem === 'imperial') {
            setUnitSystem('imperial');
          } else {
            setUnitSystem('metric');
          }
          if (parsed.trendData && Array.isArray(parsed.trendData)) setTrendData(parsed.trendData);
          if (parsed.dwellPeriods && Array.isArray(parsed.dwellPeriods)) setDwellPeriods(parsed.dwellPeriods);
          if (parsed.checklist && Array.isArray(parsed.checklist)) setChecklist(parsed.checklist);
          alert('All settings and presets loaded successfully!');
        } catch (err) {
          alert('Error parsing settings JSON file.');
        }
      };
    }
  };

  // Test Instrument Details (UK ISO/IEC 17025 Accredited)
  const [instrument, setInstrument] = useState<TestInstrument>({
    manufacturer: '',
    model: '',
    serialNumber: '',
    calibrationDate: '',
    calibrationDueDate: '',
    traceabilityNumber: '',
    maxPermissibleError: 0,
    calibrationLab: '',
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
      question: 'Number of TUS sensors meets or exceeds AMS 2750 Rev H Table 17 requirements and § 3.5.10.2 failure limits.',
      compliant: true,
      notes: 'Volume 0.441 m³ requires 9 sensors minimum per Table 17.',
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

  // Step-by-Step Wizard Workflow (Logical AMS 2750 Order)
  const STEPS = [
    { id: 'instructions', label: '1. Setup & Instructions', icon: BookOpen },
    { id: 'asset', label: '2. Furnace & Report ID', icon: Settings },
    { id: 'traceability', label: '3. Metrology Traceability', icon: Wrench },
    { id: 'dimensions', label: '4. Chamber & QWZ Specs', icon: Box },
    { id: 'layout', label: '5. Sensor Layout & Rigging', icon: Layers },
    { id: 'analysis', label: '6. Survey Data Analysis', icon: Thermometer },
    { id: 'compliance', label: '7. Audit & Generate', icon: ShieldCheck },
  ] as const;

  type StepId = typeof STEPS[number]['id'];
  const [activeStep, setActiveStep] = useState<StepId>('instructions');

  const currentStepIndex = STEPS.findIndex(s => s.id === activeStep);
  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setActiveStep(STEPS[currentStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const prevStep = () => {
    if (currentStepIndex > 0) {
      setActiveStep(STEPS[currentStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  // Chamber Architecture Presets State
  const DEFAULT_CHAMBER_PRESETS: ChamberPreset[] = [
    { id: 'custom-2500', name: 'Work Zone 15m³ (2500×3000×2000 mm)', chamber: { length: 2900, width: 3400, height: 2400, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 2900, y: 1800, z: 1700 } }, qwz: { length: 2500, width: 3000, height: 2000, offsetLeft: 200, offsetRight: 200, offsetFront: 200, offsetRear: 200, offsetFloor: 180, offsetCeiling: 220 } },
    { id: 'pic1-1200', name: 'AMS 2750 Picture 1 Standard (1200×1000×1000 mm)', chamber: { length: 1200, width: 1000, height: 1000, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 1200, y: 750, z: 500 } }, qwz: { length: 900, width: 700, height: 700, offsetLeft: 150, offsetRight: 150, offsetFront: 150, offsetRear: 150, offsetFloor: 120, offsetCeiling: 180 } },
    { id: 'drop-1800', name: 'Drop-Bottom Solution Pit (1800×1200×1500 mm)', chamber: { length: 1800, width: 1200, height: 1500, shape: 'rectangular', feedthroughWall: 'roof', feedthroughPos: { x: 900, y: 1500, z: 600 } }, qwz: { length: 1400, width: 900, height: 1100, offsetLeft: 150, offsetRight: 150, offsetFront: 200, offsetRear: 200, offsetFloor: 180, offsetCeiling: 220 } },
    { id: 'vac-900', name: 'Vacuum Hot Zone (900×900×1200 mm)', chamber: { length: 900, width: 900, height: 1200, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 900, y: 900, z: 450 } }, qwz: { length: 600, width: 600, height: 900, offsetLeft: 150, offsetRight: 150, offsetFront: 150, offsetRear: 150, offsetFloor: 150, offsetCeiling: 150 } },
    { id: 'car-3000', name: 'Large Aerospace Car-Bottom (3000×1800×1800 mm)', chamber: { length: 3000, width: 1800, height: 1800, shape: 'rectangular', feedthroughWall: 'left', feedthroughPos: { x: 1500, y: 1200, z: 0 } }, qwz: { length: 2400, width: 1400, height: 1300, offsetLeft: 200, offsetRight: 200, offsetFront: 300, offsetRear: 300, offsetFloor: 250, offsetCeiling: 250 } },
    { id: 'dense-36', name: 'High-Density 36-Sensor Grid (4m³ Heavy Aerospace)', chamber: { length: 4000, width: 4000, height: 3000, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 4000, y: 2200, z: 2000 } }, qwz: { length: 3200, width: 3200, height: 2400, offsetLeft: 400, offsetRight: 400, offsetFront: 400, offsetRear: 400, offsetFloor: 300, offsetCeiling: 300 } },
    { id: 'lab-600', name: 'Compact Laboratory Retort (600×500×500 mm)', chamber: { length: 600, width: 500, height: 500, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 600, y: 350, z: 250 } }, qwz: { length: 450, width: 350, height: 350, offsetLeft: 75, offsetRight: 75, offsetFront: 75, offsetRear: 75, offsetFloor: 60, offsetCeiling: 90 } },
  ];

  const [chamberPresets, setChamberPresets] = useState<ChamberPreset[]>(() => {
    try {
      const saved = localStorage.getItem('tus_chamber_presets_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CHAMBER_PRESETS;
  });

  const saveChamberPresets = (updated: ChamberPreset[]) => {
    setChamberPresets(updated);
    try {
      localStorage.setItem('tus_chamber_presets_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSaveCurrentChamberAsPreset = (name: string) => {
    const presetName = name.trim() || `Zone ${qwz.length}×${qwz.width}×${qwz.height} ${dimUnit}`;
    const newPreset: ChamberPreset = {
      id: `chamber-${Date.now()}`,
      name: presetName,
      chamber,
      qwz,
    };
    saveChamberPresets([...chamberPresets, newPreset]);
  };

  const handleDeleteChamberPreset = (id: string) => {
    const updated = chamberPresets.filter(p => p.id !== id);
    saveChamberPresets(updated);
  };

  const handleRenameChamberPreset = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = chamberPresets.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
    saveChamberPresets(updated);
  };

  // Apply Chamber Architecture Presets
  const handleApplyPreset = (id: string) => {
    const found = chamberPresets.find(p => p.id === id);
    let newChamber: FurnaceChamber;
    let newQWZ: QualifiedWorkZone;

    if (found) {
      newChamber = found.chamber;
      newQWZ = found.qwz;
    } else if (id === 'custom-2500') {
      newChamber = { length: 2900, width: 3400, height: 2400, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 2900, y: 1800, z: 1700 } };
      newQWZ = { length: 2500, width: 3000, height: 2000, offsetLeft: 200, offsetRight: 200, offsetFront: 200, offsetRear: 200, offsetFloor: 180, offsetCeiling: 220 };
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
    } else if (id === 'dense-36') {
      newChamber = { length: 4000, width: 4000, height: 3000, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 4000, y: 2200, z: 2000 } };
      newQWZ = { length: 3200, width: 3200, height: 2400, offsetLeft: 400, offsetRight: 400, offsetFront: 400, offsetRear: 400, offsetFloor: 300, offsetCeiling: 300 };
    } else if (id === 'lab-600') {
      newChamber = { length: 600, width: 500, height: 500, shape: 'rectangular', feedthroughWall: 'rear', feedthroughPos: { x: 600, y: 350, z: 250 } };
      newQWZ = { length: 450, width: 350, height: 350, offsetLeft: 75, offsetRight: 75, offsetFront: 75, offsetRear: 75, offsetFloor: 60, offsetCeiling: 90 };
    } else {
      newChamber = chamber;
      newQWZ = qwz;
    }

    setChamber(newChamber);
    setQWZ(newQWZ);

    const volumeM3 = calculateVolumeInM3(newQWZ, dimUnit);
    const volumeCuFt = calculateVolumeInCuFt(newQWZ, dimUnit);
    const { minSensors } = getMinRequiredSensors(volumeCuFt, volumeM3);
    const countToGenerate = id === 'dense-36' ? 36 : (id === 'pic1-1200' || id === 'custom-2500' || found ? 21 : Math.max(9, minSensors));
    const newSensors = generateStandardAMS2750Sensors(newChamber, newQWZ, countToGenerate);
    setChannels(newSensors);
    if (newSensors[0]) setSelectedChannelId(newSensors[0].id);
  };

  // Update QWZ and rescale sensors to fill the new zone
  const handleUpdateQWZ = (newQWZ: QualifiedWorkZone) => {
    setQWZ(newQWZ);

    // Proportionally rescale all existing channels so the wire grid and thermocouples immediately fill the new QWZ!
    const updatedChannels = rescaleChannelsToQWZ(channels, qwz, newQWZ, chamber);
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
    if (count === -1) {
      const balanced = balanceSensors(channels, chamber, qwz);
      setChannels(balanced);
      return;
    }
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
    evaluateSetpoint(
      sp,
      channels,
      meta.furnaceClass,
      tempUnit,
      instrument.instrumentCorrection ?? 0,
      minSensors,
      qwz,
      meta.furnaceApplication || 'Parts'
    )
  );
  const isOverallConformant = checklist.every((item) => item.compliant);

  // Auto-synchronize Audit Criteria Verification Matrix with field completeness & live TUS results
  useEffect(() => {
    setChecklist((prevChecklist) => {
      // AMS 2750 Rev H Table 7 Field Test Instrument MPE Limit: ±1.1°F or ±0.6°C
      const mpeLimit = tempUnit === '°C' ? 0.6 : 1.1;

      // Check presence of imported CSV data / readings
      const hasCsvData = trendData.length > 0 || setpoints.some((sp) => Object.keys(sp.readings).length > 0);

      // Working (non-failed) sensors evaluation per AMS 2750 Rev H § 3.5.10.2 & § 3.5.14.1.6
      const workingChannels = channels.filter((ch) => !ch.failed);
      const failedChannelsCount = channels.length - workingChannels.length;
      const maxAllowedFailures = channels.length === 9 ? 1 : Math.floor(channels.length * 0.10);
      const hasValidCountAfterFailure = channels.length === 9
        ? failedChannelsCount <= 1
        : (workingChannels.length >= minSensors && failedChannelsCount <= maxAllowedFailures);
      const hasSensorFailureViolation = setpointAnalyses.some(
        (sa) => sa.sensorFailureNote && sa.sensorFailureNote.includes('Violation')
      );
      const isSensorCountCompliant =
        hasCsvData &&
        channels.length >= minSensors &&
        hasValidCountAfterFailure &&
        !hasSensorFailureViolation;

      // Soak Duration (≥ 30 min) & Sensor Thermal Stabilization from CSV Data (nc-6)
      const isSoakDurationCompliant =
        hasCsvData &&
        setpoints.length > 0 &&
        setpoints.every((sp) => {
          const hasTimestamps = Boolean(sp.soakStartTime?.trim() && sp.soakEndTime?.trim());
          const isDurationOk = (sp.soakDurationMinutes || 0) >= 30;
          const spAnalysis = setpointAnalyses.find((sa) => sa.setpointId === sp.id);
          const isStabilized = spAnalysis ? spAnalysis.passed : false;
          return hasTimestamps && isDurationOk && isStabilized;
        });

      // Completeness & Compliance Evaluators
      const isNc1Complete = setpoints.length > 0 && meta.operatingTempMin > 0 && meta.operatingTempMax > 0 && meta.operatingTempMax > meta.operatingTempMin;
      const isNc2Complete = qwz.length > 0 && qwz.width > 0 && qwz.height > 0 && chamber.length > 0 && chamber.width > 0 && chamber.height > 0;
      const isNc4Complete = channels.length > 0 && channels.every((ch) => ch.rollLotNumber?.trim() && ch.calibrationDate?.trim());
      const isNc5Complete = meta.dataIntervalSeconds > 0 && meta.dataIntervalSeconds <= 120;
      const isNc7Complete = hasCsvData && setpoints.length > 0 && setpointAnalyses.every((sa) => sa.passed);
      const isNc8Complete = Boolean(
        instrument.manufacturer?.trim() &&
        instrument.model?.trim() &&
        instrument.serialNumber?.trim() &&
        instrument.calibrationDate?.trim() &&
        instrument.calibrationDueDate?.trim() &&
        instrument.traceabilityNumber?.trim() &&
        instrument.maxPermissibleError <= mpeLimit
      );
      const isNc9Complete = Boolean(meta.atmosphere?.trim() && meta.heatingMethod?.trim() && meta.fanCondition?.trim());
      const isNc10Complete = Boolean(meta.technicianName?.trim() && meta.qualityManagerName?.trim());

      let changed = false;
      const updated = prevChecklist.map((item) => {
        let newCompliant = item.compliant;
        let newNotes = item.notes;

        if (item.id === 'nc-1') {
          newCompliant = isNc1Complete;
          newNotes = isNc1Complete
            ? `Survey verified across operating temperature envelope (${meta.operatingTempMin}${tempUnit} to ${meta.operatingTempMax}${tempUnit}).`
            : 'NON-COMPLIANT: Operating temperature envelope or setpoints incomplete.';
        } else if (item.id === 'nc-2') {
          newCompliant = isNc2Complete;
          newNotes = isNc2Complete
            ? `Qualified Work Zone dimensions (${qwz.length}×${qwz.width}×${qwz.height} ${dimUnit}) and 6-way clearances verified.`
            : 'NON-COMPLIANT: Chamber or Qualified Work Zone dimensions incomplete.';
        } else if (item.id === 'nc-3') {
          newCompliant = isSensorCountCompliant;
          if (!hasCsvData) {
            newNotes = 'NON-COMPLIANT: No CSV survey data imported. Import datalogger CSV to verify working sensors.';
          } else if (channels.length < minSensors) {
            newNotes = `NON-COMPLIANT: ${channels.length} total TUS sensors configured, but minimum ${minSensors} required for ${volumeM3.toFixed(3)} m³ volume per AMS 2750 Rev H Table 17.`;
          } else if (hasSensorFailureViolation || !hasValidCountAfterFailure) {
            newNotes = `NON-COMPLIANT: ${failedChannelsCount} sensor failure(s) violated AMS 2750 Rev H § 3.5.10.2 / § 3.5.14.1.6 (Max ${maxAllowedFailures} allowed for ${channels.length} sensors, must keep ≥${minSensors} active, no adjacent corners, no control sensor failure).`;
          } else {
            newNotes = `Verified ${workingChannels.length}/${channels.length} active sensors in survey data (Table 17 minimum required: ${minSensors} for ${volumeM3.toFixed(3)} m³ volume${failedChannelsCount > 0 ? `, ${failedChannelsCount} open/failed sensor allowed within § 3.5.10.2 limits` : ''}).`;
          }
        } else if (item.id === 'nc-4') {
          newCompliant = isNc4Complete;
          newNotes = isNc4Complete
            ? 'Thermocouple wire roll batch lot and calibration correction factors verified per § 3.5.14.1.'
            : 'NON-COMPLIANT: Thermocouple wire roll lot numbers or calibration details incomplete.';
        } else if (item.id === 'nc-5') {
          newCompliant = isNc5Complete;
          newNotes = isNc5Complete
            ? `Continuous data logging at ${meta.dataIntervalSeconds}-second intervals verified (AMS 2750 Rev H § 3.5.10.7 max 120s).`
            : 'NON-COMPLIANT: Data logging interval empty or >120s. Import datalogger CSV to auto-detect logging interval.';
        } else if (item.id === 'nc-6') {
          newCompliant = isSoakDurationCompliant;
          if (!hasCsvData) {
            newNotes = 'NON-COMPLIANT: No CSV survey data imported. Import datalogger CSV to verify thermal stabilization & ≥30-min soak duration.';
          } else if (!isSoakDurationCompliant) {
            newNotes = 'NON-COMPLIANT: Imported CSV data shows soak duration < 30 minutes, missing timestamps, or sensors failed to remain within tolerance (§ 3.5.10.9).';
          } else {
            newNotes = '≥30-minute steady-state soak duration and sensor thermal stabilization verified per AMS 2750 Rev H § 3.5.10.9.';
          }
        } else if (item.id === 'nc-7') {
          newCompliant = isNc7Complete;
          newNotes = isNc7Complete
            ? `All setpoint temperature spreads satisfy Class ${meta.furnaceClass} tolerance (±${tolerance}${tempUnit}) with no overshoot above upper tolerance (§ 3.5.10.6).`
            : `NON-COMPLIANT: Survey data incomplete, temperature exceeded Class ${meta.furnaceClass} tolerance (±${tolerance}${tempUnit}), overshoot occurred, or offset exceeded Table 18.`;
        } else if (item.id === 'nc-8') {
          newCompliant = isNc8Complete;
          newNotes = isNc8Complete
            ? `${instrument.model || 'Field Instrument'} (S/N: ${instrument.serialNumber}) calibrated with ${instrument.traceabilityNumber} traceability (MPE ≤ ±${mpeLimit}${tempUnit} per Table 7).`
            : `NON-COMPLIANT: Instrument details, serial number, calibration dates, traceability number, or Table 7 MPE limit (±${mpeLimit}${tempUnit}) incomplete.`;
        } else if (item.id === 'nc-9') {
          newCompliant = isNc9Complete;
          newNotes = isNc9Complete
            ? `Furnace atmosphere (${meta.atmosphere}), heating method (${meta.heatingMethod}), and fan state (${meta.fanCondition}) verified per § 3.5.9.`
            : 'NON-COMPLIANT: Furnace atmosphere, heating method, or fan operating parameters incomplete.';
        } else if (item.id === 'nc-10') {
          newCompliant = isNc10Complete;
          newNotes = isNc10Complete
            ? `Formal sign-off approvals verified for Technician (${meta.technicianName}) and Quality Organization (${meta.qualityManagerName}) per § 3.5.15.2.`
            : 'NON-COMPLIANT: Authorised signatory names (Technician or Quality Organization) incomplete.';
        }

        if (newCompliant !== item.compliant || newNotes !== item.notes) {
          changed = true;
          return { ...item, compliant: newCompliant, notes: newNotes };
        }
        return item;
      });

      return changed ? updated : prevChecklist;
    });
  }, [
    channels,
    minSensors,
    volumeM3,
    setpoints,
    setpointAnalyses,
    trendData,
    meta,
    qwz,
    chamber,
    dimUnit,
    tempUnit,
    tolerance,
    instrument,
  ]);

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
                <span
                  className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase border ${
                    isOverallConformant
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {isOverallConformant ? 'PASS — CONFORMANT' : 'FAIL — NON-CONFORMANT'}
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

            {/* Step Navigation Progress Bar (Desktop) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-950/50 border border-slate-800 rounded-2xl p-1">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                const isPast = STEPS.findIndex(s => s.id === activeStep) > idx;
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => setActiveStep(step.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white font-bold shadow-md' 
                          : isPast 
                            ? 'text-blue-400 hover:text-blue-300' 
                            : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isPast ? 'text-blue-500' : 'text-slate-600'}`} />
                      <span className="text-[11px] whitespace-nowrap">{step.label.split('. ')[1]}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className="w-4 h-px bg-slate-800 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Step Indicator */}
            <div className="lg:hidden flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-blue-400">STEP {currentStepIndex + 1}/{STEPS.length}</span>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{STEPS[currentStepIndex].label.split('. ')[1]}</span>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* UK Metric Standard Toggle */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => handleToggleUnit('metric')}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    unitSystem === 'metric'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => handleToggleUnit('imperial')}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    unitSystem === 'imperial'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  °F
                </button>
              </div>

              <input
                type="file"
                ref={settingsFileInputRef}
                onChange={handleImportAllSettings}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={handleExportAllSettings}
                title="Save all settings, presets, channels, and survey data to local file"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Save Settings</span>
              </button>
              <button
                onClick={() => settingsFileInputRef.current?.click()}
                title="Load all settings and presets from local file"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Load Settings</span>
              </button>

              <button
                onClick={() => setReportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Preview Report</span>
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
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[11px]">
            <span>PRI Nadcap AC7102/8</span>
            <span>•</span>
            <span>
              {instrument.traceabilityNumber?.trim()
                ? `Traceability: ${instrument.traceabilityNumber}`
                : 'No Calibration Details Entered'}
            </span>
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
            <span className="text-[11px] text-slate-400 font-mono">
              Use mouse / sliders to rotate & inspect 2D isometric schematic
            </span>
          </div>

          {/* View Container */}
          <div className="h-[520px] xl:h-[660px] w-full">
            <TechnicalSchematic2D
              chamber={chamber}
              qwz={qwz}
              channels={channels}
              dimUnit={dimUnit}
              selectedChannelId={selectedChannelId}
              onSelectChannel={setSelectedChannelId}
              onExportImageReady={setDiagramImageBase64}
            />
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
            onNavigateTab={(tab) => {
              if (tab === 'visual') setActiveStep('dimensions');
              if (tab === 'channels') setActiveStep('layout');
              if (tab === 'equipment') setActiveStep('traceability');
            }}
          />
        </div>

        {/* Right Column: Guided Step-by-Step Workbench */}
        <div className="xl:col-span-6 flex flex-col space-y-4">
          {/* Step Controls & Info Banner */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                {React.createElement(STEPS[currentStepIndex].icon, { className: "w-4 h-4 text-blue-400" })}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{STEPS[currentStepIndex].label}</h3>
                <p className="text-[10px] text-slate-400 font-medium">Follow the steps for AMS 2750 Rev H compliance</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={currentStepIndex === STEPS.length - 1}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next Step
              </button>
            </div>
          </div>

          {/* Active Step Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeStep === 'instructions' && (
              <InstructionManual
                tempUnit={tempUnit}
                dimUnit={dimUnit}
                onNavigateTab={(tab) => {
                  if (tab === 'meta') setActiveStep('asset');
                  if (tab === 'equipment') setActiveStep('traceability');
                  if (tab === 'visual') setActiveStep('dimensions');
                  if (tab === 'channels') setActiveStep('layout');
                  if (tab === 'survey') setActiveStep('analysis');
                  if (tab === 'nadcap') setActiveStep('compliance');
                }}
              />
            )}

            {activeStep === 'asset' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4 text-cyan-400" />
                    <span>Furnace Identification & Audit Metadata</span>
                  </h3>
                   <div className="flex items-center gap-3 flex-wrap">
                     <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Class:</span>
                        <select
                          value={meta.furnaceClass}
                          onChange={(e) => setMeta({ ...meta, furnaceClass: parseInt(e.target.value) as FurnaceClass })}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-cyan-300 font-bold focus:outline-none cursor-pointer"
                        >
                          {[1,2,3,4,5,6].map(c => <option key={c} value={c}>Class {c}</option>)}
                        </select>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Type:</span>
                        <select
                          value={meta.instrumentationType}
                          onChange={(e) => setMeta({ ...meta, instrumentationType: e.target.value as InstrumentationType })}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-amber-300 font-bold focus:outline-none cursor-pointer"
                        >
                          {(['A','B','C','D+','D','E'] as InstrumentationType[]).map(t => (
                            <option key={t} value={t}>Type {t}</option>
                          ))}
                        </select>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Category:</span>
                        <select
                          value={meta.furnaceApplication || 'Parts'}
                          onChange={(e) => setMeta({ ...meta, furnaceApplication: e.target.value as 'Parts' | 'Raw Material' })}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-emerald-300 font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="Parts">Parts (Table 15)</option>
                          <option value="Raw Material">Raw Material (Table 16)</option>
                        </select>
                     </div>
                  </div>
                </div>

                {/* Furnace Presets Bar */}
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                    <span className="text-slate-400 font-medium text-xs">Quick Load Preset:</span>
                    <select
                      value={selectedFurnacePresetId}
                      onChange={(e) => handleSelectFurnacePreset(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none flex-1"
                    >
                      {furnacePresets.length === 0 ? (
                        <option value="">-- No furnace presets saved --</option>
                      ) : (
                        furnacePresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))
                      )}
                    </select>
                    <button onClick={() => handleDeleteFurnacePreset(selectedFurnacePresetId)} className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg text-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="New preset name..." value={newFurnacePresetName} onChange={(e) => setNewFurnacePresetName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none" />
                    <button onClick={handleSaveCurrentAsFurnacePreset} className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer"><Plus className="w-3.5 h-3.5" /> Save</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div><label className="block text-slate-400 mb-1">Company / Facility Name</label><input type="text" value={meta.companyName} onChange={(e) => setMeta({ ...meta, companyName: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Facility Location</label><input type="text" value={meta.facilityLocation} onChange={(e) => setMeta({ ...meta, facilityLocation: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Report Number</label><input type="text" value={meta.reportNumber} onChange={(e) => setMeta({ ...meta, reportNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Revision</label><input type="text" value={meta.revision} onChange={(e) => setMeta({ ...meta, revision: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Furnace Equipment Tag / ID</label><input type="text" value={meta.furnaceId} onChange={(e) => setMeta({ ...meta, furnaceId: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Equipment Name / Description</label><input type="text" value={meta.furnaceName} onChange={(e) => setMeta({ ...meta, furnaceName: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Furnace Model</label><input type="text" value={meta.furnaceModel} onChange={(e) => setMeta({ ...meta, furnaceModel: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Furnace Serial Number</label><input type="text" value={meta.furnaceSerial} onChange={(e) => setMeta({ ...meta, furnaceSerial: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Min Qualified Operating Temp ({tempUnit})</label><input type="number" value={meta.operatingTempMin} onChange={(e) => setMeta({ ...meta, operatingTempMin: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Max Qualified Operating Temp ({tempUnit})</label><input type="number" value={meta.operatingTempMax} onChange={(e) => setMeta({ ...meta, operatingTempMax: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Furnace Atmosphere (§ 3.5.9)</label><input type="text" placeholder="e.g. Air, Nitrogen, Vacuum, Argon" value={meta.atmosphere} onChange={(e) => setMeta({ ...meta, atmosphere: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Heating Method</label><input type="text" placeholder="e.g. Electric Resistance, Gas Radiant" value={meta.heatingMethod} onChange={(e) => setMeta({ ...meta, heatingMethod: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-slate-400 mb-1">Circulation Fan Status (§ 3.5.9.5)</label><input type="text" placeholder="e.g. High Speed On / N/A" value={meta.fanCondition} onChange={(e) => setMeta({ ...meta, fanCondition: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none" /></div>
                  <div>
                    <label className="block text-slate-400 mb-1">Load Condition (§ 3.5.5.2)</label>
                    <select
                      value={meta.loadCondition}
                      onChange={(e) => setMeta({ ...meta, loadCondition: e.target.value as SurveyMetadata['loadCondition'] })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Empty">Empty</option>
                      <option value="Rack">Fixture / Rack Only</option>
                      <option value="Simulated Production Load">Simulated Production Load</option>
                      <option value="Maximum Production Load">Actual Production Load</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">TUS Interval & Frequency (AMS 2750 Rev H Table 15 / Table 16 & Table 20)</h4>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isExtendedInterval} onChange={(e) => setIsExtendedInterval(e.target.checked)} className="rounded border-slate-700 text-cyan-500 focus:ring-0" />
                        <span className="text-[10px] text-slate-300">Apply Reduced Frequency (Extended Interval)</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <div className="sm:col-span-2 text-[11px] text-slate-300 leading-relaxed">
                        {getTusIntervalInfo(meta.furnaceClass, meta.instrumentationType, meta.furnaceApplication || 'Parts').description}
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center">
                        <div className="text-[9px] uppercase font-bold text-slate-500">Next TUS Due Date</div>
                        <div className="text-sm font-bold text-cyan-300 font-mono">
                          {calculateNextTusDueDate(meta.date, meta.furnaceClass, isExtendedInterval, meta.instrumentationType, meta.furnaceApplication || 'Parts')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'traceability' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <TestEquipmentManager
                  instrument={instrument}
                  onUpdateInstrument={setInstrument}
                  channels={channels}
                  tempUnit={tempUnit}
                />
              </div>
            )}

            {activeStep === 'dimensions' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <DimensionInputs
                  chamber={chamber}
                  qwz={qwz}
                  dimUnit={dimUnit}
                  channelCount={channels.length}
                  tempUnit={tempUnit}
                  instrument={instrument}
                  chamberPresets={chamberPresets}
                  onUpdateChamber={handleUpdateChamber}
                  onUpdateQWZ={handleUpdateQWZ}
                  onApplyPreset={handleApplyPreset}
                  onSaveCurrentAsPreset={handleSaveCurrentChamberAsPreset}
                  onDeletePreset={handleDeleteChamberPreset}
                  onRenamePreset={handleRenameChamberPreset}
                  onFitSensorsToQWZ={handleFitSensorsToQWZ}
                  onUpdateInstrument={setInstrument}
                  onNavigateTab={(tab) => {
                    if (tab === 'channels') setActiveStep('layout');
                  }}
                />
              </div>
            )}

            {activeStep === 'layout' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-slate-100 text-sm">Wire Rigging & Cutting Schedule</h3>
                  </div>
                  <WireRiggingGuide 
                    qwz={qwz}
                    channels={channels}
                    dimUnit={dimUnit}
                  />
                </div>
              </div>
            )}

            {activeStep === 'analysis' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SurveyDataSection
                  setpoints={setpoints}
                  channels={channels}
                  furnaceClass={meta.furnaceClass}
                  tempUnit={tempUnit}
                  instrumentCorrection={instrument.instrumentCorrection ?? 0}
                  meta={meta}
                  qwz={qwz}
                  onUpdateSetpoints={setSetpoints}
                  onUpdateChannels={setChannels}
                  onUpdateMeta={setMeta}
                  onUpdateTrendData={setTrendData}
                  onUpdateDwellPeriods={setDwellPeriods}
                />
              </div>
            )}

            {activeStep === 'compliance' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <NadcapChecklist
                  checklist={checklist}
                  instrument={instrument}
                  meta={meta}
                  onUpdateChecklist={setChecklist}
                  onUpdateInstrument={setInstrument}
                  onUpdateMeta={setMeta}
                />
                
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 text-center">
                   <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                   <h3 className="text-lg font-bold text-white mb-2">Final Survey Verification</h3>
                   <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                     All survey data has been processed. Review the checklist above and the report preview before final generation.
                   </p>
                   <button
                    onClick={() => setReportModalOpen(true)}
                    className="inline-flex items-center gap-3 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-xl shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Generate Full AMS 2750 Report (.pdf)</span>
                  </button>
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
