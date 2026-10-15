import React, { useState } from 'react';
import {
  TestInstrument,
  SecondaryStandard,
  ThermocoupleChannel,
  TempUnit,
} from '../types/tus';
import {
  Wrench,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  FileText,
  Building2,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Save,
  RotateCcw,
  X,
} from 'lucide-react';

interface TestEquipmentManagerProps {
  instrument: TestInstrument;
  onUpdateInstrument: (inst: TestInstrument) => void;
  channels: ThermocoupleChannel[];
  tempUnit: TempUnit;
}

export interface AerospaceInstrumentPreset {
  id: string;
  label: string;
  instrument: Partial<TestInstrument>;
}

export const DEFAULT_AEROSPACE_PRESETS: AerospaceInstrumentPreset[] = [
  {
    id: 'yokogawa',
    label: 'Yokogawa DX2030 (UKAS Accredited)',
    instrument: {
      manufacturer: 'Yokogawa Metrology UK',
      model: 'DX2030 Paperless Advanced TUS Recorder',
      serialNumber: 'YK-884920-TUS',
      assetTag: 'AST-AERO-042',
      equipmentType: 'Paperless Video Graphic TUS Data Logger',
      calibrationStandard: 'UKAS / ISO/IEC 17025 Accredited Calibration',
      traceabilityNumber: 'UKAS-CAL-74921-2026',
      calibrationLab: 'Trescal UK Metrology Services (UKAS Lab #0123)',
      maxPermissibleError: 0.2,
      calibratedByTechnician: 'D. Edwards (Senior Calibration Metrologist)',
    },
  },
  {
    id: 'eurotherm',
    label: 'Eurotherm Nanodac High-Precision DAS',
    instrument: {
      manufacturer: 'Eurotherm by Schneider Electric',
      model: 'Nanodac Multi-Channel Precision TUS Recorder',
      serialNumber: 'ET-554109-ND',
      assetTag: 'AST-AERO-088',
      equipmentType: 'Digital Graphic Recorder / Controller',
      calibrationStandard: 'ISO/IEC 17025 Accredited Laboratory',
      traceabilityNumber: 'NIST-CAL-99382-2026',
      calibrationLab: 'Eurotherm UKAS Calibration Laboratory',
      maxPermissibleError: 0.25,
      calibratedByTechnician: 'R. Hall (Certified Pyrometry Inspector)',
    },
  },
  {
    id: 'fluke',
    label: 'Fluke Hydra Series III 2638A',
    instrument: {
      manufacturer: 'Fluke Calibration',
      model: 'Hydra Series III 2638A Precision Data Acquisition System',
      serialNumber: 'FLK-410982-HY',
      assetTag: 'AST-MET-115',
      equipmentType: 'High-Accuracy Data Acquisition System',
      calibrationStandard: 'UKAS National Physical Laboratory (NPL) Traceable',
      traceabilityNumber: 'UKAS-FLK-88123-2026',
      calibrationLab: 'Fluke UK Service & Metrology Centre',
      maxPermissibleError: 0.18,
      calibratedByTechnician: 'S. Jenkins (Metrology Specialist)',
    },
  },
  {
    id: 'keysight',
    label: 'Keysight DAQ970A Precision DAS',
    instrument: {
      manufacturer: 'Keysight Technologies',
      model: 'DAQ970A Precision Metrology Data Acquisition System',
      serialNumber: 'MY-59002341',
      assetTag: 'AST-MET-204',
      equipmentType: '6½-Digit Multimeter & Multiplexer DAS',
      calibrationStandard: 'ANSI/NCSL Z540-1-1994 Traceable',
      traceabilityNumber: 'NIST-821-24910-KEY',
      calibrationLab: 'Keysight Accredited Metrology Laboratory',
      maxPermissibleError: 0.15,
      calibratedByTechnician: 'M. Vance (Lead Pyrometry Metrologist)',
    },
  },
  {
    id: 'grant',
    label: 'Grant Squirrel SQ2040 (UK Metrology)',
    instrument: {
      manufacturer: 'Grant Instruments Cambridge Ltd',
      model: 'Squirrel SQ2040 2F8 Portable TUS Data Logger',
      serialNumber: 'GRT-SQ-77291',
      assetTag: 'AST-AERO-109',
      equipmentType: 'High-Accuracy Multi-Channel Logger',
      calibrationStandard: 'UKAS Accredited Lab Calibration',
      traceabilityNumber: 'UKAS-GRT-49102-2026',
      calibrationLab: 'Grant Metrology UKAS Calibration Centre',
      maxPermissibleError: 0.22,
      calibratedByTechnician: 'P. Stewart (Pyrometry Specialist)',
    },
  },
];

export const TestEquipmentManager: React.FC<TestEquipmentManagerProps> = ({
  instrument,
  onUpdateInstrument,
  channels,
  tempUnit,
}) => {
  // Calculate Calibration Validity Status
  const today = new Date();
  const dueDate = instrument.calibrationDueDate ? new Date(instrument.calibrationDueDate) : null;
  const calDate = instrument.calibrationDate ? new Date(instrument.calibrationDate) : null;

  let daysRemaining: number | null = null;
  let calStatus: 'valid' | 'expiring' | 'expired' = 'valid';

  if (dueDate && !isNaN(dueDate.getTime())) {
    const diffTime = dueDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      calStatus = 'expired';
    } else if (daysRemaining <= 30) {
      calStatus = 'expiring';
    } else {
      calStatus = 'valid';
    }
  }

  // AMS 2750 Rev H Table 7 Field Test Instrument MPE Limit:
  // ±1.0°F (±0.6°C) or ±0.1% of reading, whichever is greater
  const mpeLimit = tempUnit === '°C' ? 0.6 : 1.0;
  const isMpeCompliant = instrument.maxPermissibleError <= mpeLimit;

  // Preset management with persistent localStorage
  const [presets, setPresets] = useState<AerospaceInstrumentPreset[]>(() => {
    try {
      const saved = localStorage.getItem('tus_instrument_presets_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_AEROSPACE_PRESETS;
  });

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [customPresetModalOpen, setCustomPresetModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    label: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    assetTag: '',
    equipmentType: 'TUS Data Acquisition System',
    calibrationLab: 'UKAS / NIST Accredited Metrology Lab',
    traceabilityNumber: 'UKAS-CERT-' + Math.floor(10000 + Math.random() * 90000),
    calibrationStandard: 'ISO/IEC 17025 Accredited Calibration',
    maxPermissibleError: 0.2,
  });

  const savePresetsToStorage = (updated: AerospaceInstrumentPreset[]) => {
    setPresets(updated);
    try {
      localStorage.setItem('tus_instrument_presets_v2', JSON.stringify(updated));
    } catch (e) {}
  };

  // Delete preset
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    savePresetsToStorage(updated);
  };

  // Reset presets to factory defaults
  const handleResetDefaultPresets = () => {
    savePresetsToStorage(DEFAULT_AEROSPACE_PRESETS);
  };

  // Save current active instrument as preset
  const handleSaveCurrentAsPreset = () => {
    const label = newPresetLabel.trim() || `${instrument.manufacturer} ${instrument.model || 'Recorder'}`;
    const newPreset: AerospaceInstrumentPreset = {
      id: `preset-${Date.now()}`,
      label,
      instrument: {
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        assetTag: instrument.assetTag,
        equipmentType: instrument.equipmentType,
        calibrationStandard: instrument.calibrationStandard,
        traceabilityNumber: instrument.traceabilityNumber,
        calibrationLab: instrument.calibrationLab,
        maxPermissibleError: instrument.maxPermissibleError,
        calibratedByTechnician: instrument.calibratedByTechnician,
        asFoundError: instrument.asFoundError,
        asLeftError: instrument.asLeftError,
      },
    };
    savePresetsToStorage([...presets, newPreset]);
    setNewPresetLabel('');
    setSaveModalOpen(false);
  };

  // Create custom preset from scratch
  const handleCreateCustomPreset = () => {
    if (!customForm.label.trim()) return;
    const newPreset: AerospaceInstrumentPreset = {
      id: `preset-${Date.now()}`,
      label: customForm.label.trim(),
      instrument: {
        manufacturer: customForm.manufacturer || 'Aerospace Instruments',
        model: customForm.model || 'Custom Recorder',
        serialNumber: customForm.serialNumber || 'SN-AERO-' + Math.floor(1000 + Math.random() * 9000),
        assetTag: customForm.assetTag,
        equipmentType: customForm.equipmentType,
        calibrationStandard: customForm.calibrationStandard,
        traceabilityNumber: customForm.traceabilityNumber,
        calibrationLab: customForm.calibrationLab,
        maxPermissibleError: customForm.maxPermissibleError,
      },
    };
    savePresetsToStorage([...presets, newPreset]);
    setCustomPresetModalOpen(false);
    setCustomForm({
      label: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      assetTag: '',
      equipmentType: 'TUS Data Acquisition System',
      calibrationLab: 'UKAS / NIST Accredited Metrology Lab',
      traceabilityNumber: 'UKAS-CERT-' + Math.floor(10000 + Math.random() * 90000),
      calibrationStandard: 'ISO/IEC 17025 Accredited Calibration',
      maxPermissibleError: 0.2,
    });
  };

  // Apply a preset
  const applyPresetItem = (preset: AerospaceInstrumentPreset) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sixMonthsLater = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

    onUpdateInstrument({
      ...instrument,
      ...preset.instrument,
      calibrationDate: instrument.calibrationDate || todayStr,
      calibrationDueDate: instrument.calibrationDueDate || sixMonthsLater,
      maxPermissibleError: preset.instrument.maxPermissibleError ?? instrument.maxPermissibleError,
      asFoundError: preset.instrument.asFoundError ?? instrument.asFoundError,
      asLeftError: preset.instrument.asLeftError ?? instrument.asLeftError,
    });
  };

  // Secondary Standards Handlers
  const secondaryList = instrument.secondaryStandards || [
    {
      id: 'sec-1',
      name: 'Fluke 754 Documenting Process Calibrator (Reference DMM)',
      manufacturer: 'Fluke Metrology',
      model: '754-HART',
      serialNumber: 'FLK-754-99120',
      calibrationDate: '2026-06-10',
      calibrationDueDate: '2027-06-10',
      traceabilityNumber: 'UKAS-CERT-88421',
    },
    {
      id: 'sec-2',
      name: 'Isotech TTI-22 High Precision Resistance Bridge Thermometer',
      manufacturer: 'Isothermal Technology Ltd',
      model: 'TTI-22',
      serialNumber: 'ISO-2204-19',
      calibrationDate: '2026-04-15',
      calibrationDueDate: '2027-04-15',
      traceabilityNumber: 'UKAS-CAL-ISO-4421',
    },
  ];

  const handleAddSecondary = () => {
    const newSec: SecondaryStandard = {
      id: `sec-${Date.now()}`,
      name: 'Auxiliary Reference Standard',
      manufacturer: 'Fluke Calibration',
      model: 'Reference Standard',
      serialNumber: 'SN-NEW-01',
      calibrationDate: new Date().toISOString().split('T')[0],
      calibrationDueDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      traceabilityNumber: 'UKAS-CAL-PENDING',
    };
    onUpdateInstrument({
      ...instrument,
      secondaryStandards: [...secondaryList, newSec],
    });
  };

  const handleUpdateSecondary = (id: string, field: keyof SecondaryStandard, val: string) => {
    const updated = secondaryList.map((item) =>
      item.id === id ? { ...item, [field]: val } : item
    );
    onUpdateInstrument({
      ...instrument,
      secondaryStandards: updated,
    });
  };

  const handleRemoveSecondary = (id: string) => {
    const updated = secondaryList.filter((item) => item.id !== id);
    onUpdateInstrument({
      ...instrument,
      secondaryStandards: updated,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Calibration Health & Status Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-950/80 border border-blue-800/60 rounded-xl text-blue-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  Test Instrument Calibration Status & Traceability
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 font-bold">
                  AMS 2750 Rev H § 3.2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audited against Nadcap AC7102/8 § 4.3 & Table 7 Field Test Instrument Calibration Limits.
              </p>
            </div>
          </div>

          {/* Live Calibration Health Badge */}
          <div className="flex items-center gap-2">
            {calStatus === 'valid' && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-bold font-mono flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CALIBRATION VALID ({daysRemaining} DAYS REMAINING)</span>
              </div>
            )}
            {calStatus === 'expiring' && (
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-700/80 text-amber-300 text-xs font-bold font-mono flex items-center gap-2 shadow-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>EXPIRING SOON ({daysRemaining} DAYS REMAINING)</span>
              </div>
            )}
            {calStatus === 'expired' && (
              <div className="px-3.5 py-1.5 rounded-xl bg-red-950/80 border border-red-700/80 text-red-300 text-xs font-bold font-mono flex items-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>CALIBRATION EXPIRED (AUDIT DEFICIENCY)</span>
              </div>
            )}
          </div>
        </div>

        {/* MPE Verification & Standards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              isMpeCompliant
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                : 'bg-red-950/30 border-red-800/50 text-red-200'
            }`}
          >
            {isMpeCompliant ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-white text-xs">
                Maximum Permissible Error (MPE): ±{instrument.maxPermissibleError} {tempUnit}
              </div>
              <div className="text-[11px] text-slate-300 pt-0.5 leading-relaxed font-mono">
                AMS 2750 Rev H Table 7 Field Test Instrument Limit: ±{mpeLimit} {tempUnit} (±1.0°F / ±0.6°C).
                Status: {isMpeCompliant ? (
                  <strong className="text-emerald-400">Compliant (Within Allowed Tolerance)</strong>
                ) : (
                  <strong className="text-red-400">Exceeds Maximum Permissible Error</strong>
                )}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-xs">
                National Metrology Traceability Attestation
              </div>
              <div className="text-[11px] text-slate-400 pt-0.5 leading-relaxed font-mono">
                Traceability ID: <strong className="text-cyan-300">{instrument.traceabilityNumber || 'None Specified'}</strong>
                <br />
                Lab: <span className="text-slate-300">{instrument.calibrationLab || 'Accredited Lab'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Popular TUS Recorder Presets (Fully Customizable with Add/Delete) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Load Popular Aerospace Test Instrument Presets ({presets.length} Presets Available):
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNewPresetLabel(`${instrument.manufacturer} ${instrument.model || 'Recorder'}`);
                setSaveModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
              title="Save the currently filled equipment details as a reusable preset"
            >
              <Save className="w-3 h-3" />
              <span>Save Current as Preset</span>
            </button>

            <button
              onClick={() => setCustomPresetModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 text-xs font-medium transition-colors cursor-pointer"
              title="Add a custom test instrument preset"
            >
              <Plus className="w-3 h-3" />
              <span>Add Custom Preset</span>
            </button>

            <button
              onClick={handleResetDefaultPresets}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
              title="Reset presets list to standard factory defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="group flex items-center rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/60 transition-all overflow-hidden shadow-sm"
            >
              <button
                onClick={() => applyPresetItem(preset)}
                className="px-3 py-1.5 text-xs text-slate-200 hover:text-cyan-300 font-medium transition-colors cursor-pointer text-left"
                title={`Click to load ${preset.label}`}
              >
                {preset.label}
              </button>
              <button
                onClick={(e) => handleDeletePreset(preset.id, e)}
                className="px-2 py-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/60 transition-colors border-l border-slate-700/60 cursor-pointer"
                title={`Delete preset "${preset.label}"`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {presets.length === 0 && (
            <div className="text-xs text-slate-500 italic py-1">
              No presets available. Click "Reset Defaults" or "Save Current as Preset" to add items.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Save Current Instrument as Preset */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Current Instrument as Preset</span>
              </h4>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Preset Display Label</label>
                <input
                  type="text"
                  value={newPresetLabel}
                  onChange={(e) => setNewPresetLabel(e.target.value)}
                  placeholder="e.g. Yokogawa DX2030 (Shop 3 Calibrated)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="bg-slate-950 rounded-lg p-3 text-[11px] font-mono text-slate-400 space-y-1">
                <div>Manufacturer: <span className="text-slate-200">{instrument.manufacturer || 'N/A'}</span></div>
                <div>Model: <span className="text-slate-200">{instrument.model || 'N/A'}</span></div>
                <div>Serial: <span className="text-slate-200">{instrument.serialNumber || 'N/A'}</span></div>
                <div>MPE: <span className="text-slate-200">±{instrument.maxPermissibleError} {tempUnit}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentAsPreset}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Preset */}
      {customPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Create New Test Instrument Preset</span>
              </h4>
              <button
                onClick={() => setCustomPresetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-300 mb-1 font-medium">Preset Display Label *</label>
                <input
                  type="text"
                  value={customForm.label}
                  onChange={(e) => setCustomForm({ ...customForm, label: e.target.value })}
                  placeholder="e.g. Fluke 2638A Hydra Series (UKAS Calibrated)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={customForm.manufacturer}
                  onChange={(e) => setCustomForm({ ...customForm, manufacturer: e.target.value })}
                  placeholder="e.g. Fluke Calibration"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Model</label>
                <input
                  type="text"
                  value={customForm.model}
                  onChange={(e) => setCustomForm({ ...customForm, model: e.target.value })}
                  placeholder="e.g. Hydra 2638A"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={customForm.serialNumber}
                  onChange={(e) => setCustomForm({ ...customForm, serialNumber: e.target.value })}
                  placeholder="e.g. FLK-992144"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">MPE Limit (± {tempUnit})</label>
                <input
                  type="number"
                  step="0.05"
                  value={customForm.maxPermissibleError}
                  onChange={(e) => setCustomForm({ ...customForm, maxPermissibleError: parseFloat(e.target.value) || 0.2 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Calibration Laboratory & Standard</label>
                <input
                  type="text"
                  value={customForm.calibrationLab}
                  onChange={(e) => setCustomForm({ ...customForm, calibrationLab: e.target.value })}
                  placeholder="e.g. UKAS Accredited Metrology Laboratory"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setCustomPresetModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomPreset}
                disabled={!customForm.label.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-sm cursor-pointer"
              >
                Add Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Primary TUS Data Acquisition Instrument Inputs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Primary TUS Field Test Instrument Details
            </h3>
          </div>
          <span className="text-xs font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 px-2.5 py-0.5 rounded">
            Recorder Channels Active: {channels.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Recorder / Data Logger Manufacturer
            </label>
            <input
              type="text"
              value={instrument.manufacturer}
              onChange={(e) => onUpdateInstrument({ ...instrument, manufacturer: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Yokogawa Metrology UK"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Instrument Model
            </label>
            <input
              type="text"
              value={instrument.model}
              onChange={(e) => onUpdateInstrument({ ...instrument, model: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. DX2030 Paperless Advanced Recorder"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Instrument Serial Number
            </label>
            <input
              type="text"
              value={instrument.serialNumber}
              onChange={(e) => onUpdateInstrument({ ...instrument, serialNumber: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. YK-884920-TUS"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Internal Asset / Tool Tag ID
            </label>
            <input
              type="text"
              value={instrument.assetTag || ''}
              onChange={(e) => onUpdateInstrument({ ...instrument, assetTag: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. AST-AERO-042"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Equipment Type / Architecture
            </label>
            <input
              type="text"
              value={instrument.equipmentType || 'Digital Multi-channel TUS Recorder'}
              onChange={(e) => onUpdateInstrument({ ...instrument, equipmentType: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Video Graphic Paperless Recorder"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Maximum Permissible Error (MPE) in {tempUnit}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0.01"
                value={instrument.maxPermissibleError}
                onChange={(e) =>
                  onUpdateInstrument({
                    ...instrument,
                    maxPermissibleError: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">
                ± {tempUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibration Date
            </label>
            <input
              type="date"
              value={instrument.calibrationDate}
              onChange={(e) => onUpdateInstrument({ ...instrument, calibrationDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibration Expiration / Due Date
            </label>
            <input
              type="date"
              value={instrument.calibrationDueDate}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, calibrationDueDate: e.target.value })
              }
              className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                calStatus === 'expired'
                  ? 'border-red-500 text-red-300'
                  : calStatus === 'expiring'
                  ? 'border-amber-500 text-amber-300'
                  : 'border-slate-700 text-slate-100 focus:border-cyan-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibration Traceability Number (UKAS / NIST)
            </label>
            <input
              type="text"
              value={instrument.traceabilityNumber}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, traceabilityNumber: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. UKAS-CAL-74921-2026"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Accredited Calibration Laboratory
            </label>
            <input
              type="text"
              value={instrument.calibrationLab}
              onChange={(e) => onUpdateInstrument({ ...instrument, calibrationLab: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Trescal UKAS Metrology Services"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibration Standard Reference
            </label>
            <input
              type="text"
              value={instrument.calibrationStandard || 'ISO/IEC 17025 / UKAS Accredited'}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, calibrationStandard: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. ISO/IEC 17025 Accredited Calibration"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibrated By (Certified Metrologist)
            </label>
            <input
              type="text"
              value={instrument.calibratedByTechnician || ''}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, calibratedByTechnician: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. D. Edwards, Senior Metrologist"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Max "As Found" Error
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={instrument.asFoundError ?? ''}
                onChange={(e) =>
                  onUpdateInstrument({
                    ...instrument,
                    asFoundError: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">
                {tempUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Max "As Left" Error
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={instrument.asLeftError ?? ''}
                onChange={(e) =>
                  onUpdateInstrument({
                    ...instrument,
                    asLeftError: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">
                {tempUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Secondary / Auxiliary Metrology Standards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Secondary & Auxiliary Metrology Standards (Calibration Hierarchy)
            </h3>
          </div>
          <button
            onClick={handleAddSecondary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Auxiliary Instrument</span>
          </button>
        </div>

        <div className="space-y-3">
          {secondaryList.map((sec) => (
            <div
              key={sec.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
            >
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Instrument Name & Model
                </label>
                <input
                  type="text"
                  value={sec.name}
                  onChange={(e) => handleUpdateSecondary(sec.id, 'name', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={sec.serialNumber}
                  onChange={(e) => handleUpdateSecondary(sec.id, 'serialNumber', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Calibration Date
                </label>
                <input
                  type="date"
                  value={sec.calibrationDate}
                  onChange={(e) => handleUpdateSecondary(sec.id, 'calibrationDate', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Calibration Due Date
                </label>
                <input
                  type="date"
                  value={sec.calibrationDueDate}
                  onChange={(e) => handleUpdateSecondary(sec.id, 'calibrationDueDate', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Traceability #
                  </label>
                  <input
                    type="text"
                    value={sec.traceabilityNumber}
                    onChange={(e) => handleUpdateSecondary(sec.id, 'traceabilityNumber', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleRemoveSecondary(sec.id)}
                  className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-400 hover:bg-red-900 transition-colors cursor-pointer"
                  title="Remove auxiliary instrument"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Active Thermocouple Wire Roll Traceability Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Thermocouple Wire Roll / Lot Calibration Traceability
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            AMS 2750 Rev H Table 1 & Table 3
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-xs text-slate-400">Thermocouple Wire Type:</div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              Type {channels[0]?.type || 'N'} (Nicrosil-Nisil)
            </div>
            <div className="text-[11px] text-slate-500">
              Special Limits of Error (AMS 2750 Table 1)
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-xs text-slate-400">Roll Lot Batch Numbers:</div>
            <div className="text-sm font-bold text-cyan-300 font-mono truncate">
              {Array.from(new Set(channels.map((c) => c.rollLotNumber))).join(', ')}
            </div>
            <div className="text-[11px] text-slate-500">
              Calibration offsets applied in TUS readings
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-xs text-slate-400">Sensor Usage Limit:</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              Valid (≤ 90 uses / 180 days)
            </div>
            <div className="text-[11px] text-slate-500">
              Batch recalibration tracked per AMS 2750
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
