import React, { useState } from 'react';
import {
  ThermocoupleChannel,
  FurnaceChamber,
  QualifiedWorkZone,
  DimUnit,
  TempUnit,
  WireType,
  SurveySetpoint,
} from '../types/tus';
import {
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eraser,
  Hash,
} from 'lucide-react';
import {
  generateStandardAMS2750Sensors,
  computeSensorDistances,
  balanceSensors,
  assignSensorChannelNumber,
  clearAllSensorNumbers,
  resetSequentialSensorNumbers,
  formatSensorLabelWithNumber,
} from '../utils/ams2750';

interface ChannelManagerProps {
  channels: ThermocoupleChannel[];
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  dimUnit: DimUnit;
  tempUnit: TempUnit;
  setpoints: SurveySetpoint[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onUpdateChannels: (channels: ThermocoupleChannel[]) => void;
}

export const ChannelManager: React.FC<ChannelManagerProps> = ({
  channels,
  chamber,
  qwz,
  dimUnit,
  tempUnit,
  setpoints,
  selectedChannelId,
  onSelectChannel,
  onUpdateChannels,
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'cards'>('table');
  const [filterQuery, setFilterQuery] = useState('');
  const [batchLotModalOpen, setBatchLotModalOpen] = useState(false);
  const [batchLotNumber, setBatchLotNumber] = useState('LOT-2026-N102');
  const [batchWireType, setBatchWireType] = useState<WireType>('N');
  const [batchUses, setBatchUses] = useState(1);

  // Add a new channel at center or custom position
  const handleAddChannel = () => {
    const nextNum = channels.length > 0 ? Math.max(...channels.map((c) => c.channelNumber)) + 1 : 1;
    const defaultX = qwz.offsetFront + qwz.length / 2;
    const defaultY = qwz.offsetFloor + qwz.height / 2;
    const defaultZ = qwz.offsetLeft + qwz.width / 2;
    const distances = computeSensorDistances(defaultX, defaultY, defaultZ, chamber);

    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const newChannel: ThermocoupleChannel = {
      id: `tc-${Date.now()}`,
      channelNumber: nextNum,
      label: `TC ${nextNum}: User Custom Location`,
      type: 'N',
      rollLotNumber: '',
      calibrationDate: today,
      expirationDate: expiry,
      recorderChannel: `CH-${String(nextNum).padStart(2, '0')}`,
      ...distances,
      x: defaultX,
      y: defaultY,
      z: defaultZ,
      correctionFactors: {},
    };

    setpoints.forEach((sp) => {
      newChannel.correctionFactors[sp.id] = 0.0;
    });

    const updated = [...channels, newChannel];
    onUpdateChannels(updated);
    onSelectChannel(newChannel.id);
  };

  // Duplicate an existing channel
  const handleDuplicateChannel = (ch: ThermocoupleChannel) => {
    const nextNum = Math.max(...channels.map((c) => c.channelNumber)) + 1;
    const duplicated: ThermocoupleChannel = {
      ...ch,
      id: `tc-${Date.now()}`,
      channelNumber: nextNum,
      label: `TC ${nextNum}: Copy of TC ${ch.channelNumber}`,
      recorderChannel: `CH-${String(nextNum).padStart(2, '0')}`,
    };
    onUpdateChannels([...channels, duplicated]);
    onSelectChannel(duplicated.id);
  };

  // Remove channel
  const handleRemoveChannel = (id: string) => {
    if (channels.length <= 1) return;
    const updated = channels.filter((c) => c.id !== id);
    onUpdateChannels(updated);
    if (selectedChannelId === id) {
      onSelectChannel(updated[0]?.id || '');
    }
  };

  // Reset to standard AMS 2750 Rev H layout
  const handleResetStandard = (count: number) => {
    const std = generateStandardAMS2750Sensors(chamber, qwz, count);
    onUpdateChannels(std);
    if (std[0]) onSelectChannel(std[0].id);
  };

  // Clear all channel numbering so operator can map physical sensors to field instrument channels
  const handleClearAllNumbering = () => {
    onUpdateChannels(clearAllSensorNumbers(channels));
  };

  // Restore sequential channel numbering (1..N)
  const handleResetSequentialNumbering = () => {
    onUpdateChannels(resetSequentialSensorNumbers(channels));
  };

  // Assign or clear a specific channel's Field Instrument Channel Number
  // When commit = false (during active typing), updates the target sensor immediately on both Schematic & Sensor Manager
  // When commit = true (onBlur / Enter), resolves any duplicate channel numbers
  const handleAssignChannelNumber = (id: string, rawVal: string, commit: boolean = false) => {
    const trimmed = rawVal.trim();
    const parsed = trimmed === '' ? 0 : Math.max(0, parseInt(trimmed, 10) || 0);
    onUpdateChannels(assignSensorChannelNumber(channels, id, parsed, commit));
  };

  // Sync Recorder Channel edits (e.g., "CH-05" or "5") back to channelNumber & Schematic on commit
  const handleCommitRecorderChannel = (id: string, rawRecorder: string) => {
    const trimmed = rawRecorder.trim();
    if (!trimmed || /^unassigned$/i.test(trimmed)) {
      onUpdateChannels(assignSensorChannelNumber(channels, id, 0, true));
      return;
    }
    const match = trimmed.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        onUpdateChannels(assignSensorChannelNumber(channels, id, parsed, true));
      }
    }
  };

  // Sync Location Description edits if operator changes "TC X:" prefix or edits location name
  const handleCommitLabel = (ch: ThermocoupleChannel) => {
    const tcPrefixMatch = ch.label.match(/^TC\s*(\d+)\s*[-:]\s*(.*)$/i);
    if (tcPrefixMatch) {
      const prefixNum = parseInt(tcPrefixMatch[1], 10);
      if (!isNaN(prefixNum) && prefixNum > 0 && prefixNum !== ch.channelNumber) {
        onUpdateChannels(assignSensorChannelNumber(channels, ch.id, prefixNum, true));
        return;
      }
    }
    const syncedLabel = formatSensorLabelWithNumber(ch.label, ch.channelNumber);
    if (syncedLabel !== ch.label) {
      handleUpdateChannel(ch.id, { label: syncedLabel });
    }
  };

  // Update a single channel field
  const handleUpdateChannel = (id: string, updates: Partial<ThermocoupleChannel>) => {
    const updated = channels.map((ch) => {
      if (ch.id !== id) return ch;
      return { ...ch, ...updates };
    });
    onUpdateChannels(updated);
  };

  // Handle surface distance changes with automatic coordinate and complement distance syncing:
  // distLeft + distRight = chamber.width
  // distFront + distRear = chamber.length
  // distFloor + distCeiling = chamber.height
  const handleDistanceChange = (
    id: string,
    field: 'distLeft' | 'distRight' | 'distFront' | 'distRear' | 'distFloor' | 'distCeiling',
    val: string
  ) => {
    const num = Math.max(0, parseFloat(val) || 0);
    const updated = channels.map((ch) => {
      if (ch.id !== id) return ch;

      let { x, y, z, distLeft, distRight, distFront, distRear, distFloor, distCeiling } = ch;

      if (field === 'distLeft') {
        distLeft = num;
        z = num;
        distRight = Math.max(0, Math.round((chamber.width - num) * 10) / 10);
      } else if (field === 'distRight') {
        distRight = num;
        z = Math.max(0, chamber.width - num);
        distLeft = Math.max(0, Math.round((chamber.width - num) * 10) / 10);
      } else if (field === 'distFront') {
        distFront = num;
        x = num;
        distRear = Math.max(0, Math.round((chamber.length - num) * 10) / 10);
      } else if (field === 'distRear') {
        distRear = num;
        x = Math.max(0, chamber.length - num);
        distFront = Math.max(0, Math.round((chamber.length - num) * 10) / 10);
      } else if (field === 'distFloor') {
        distFloor = num;
        y = num;
        distCeiling = Math.max(0, Math.round((chamber.height - num) * 10) / 10);
      } else if (field === 'distCeiling') {
        distCeiling = num;
        y = Math.max(0, chamber.height - num);
        distFloor = Math.max(0, Math.round((chamber.height - num) * 10) / 10);
      }

      return {
        ...ch,
        x,
        y,
        z,
        distLeft,
        distRight,
        distFront,
        distRear,
        distFloor,
        distCeiling,
      };
    });
    onUpdateChannels(updated);
  };

  // Batch apply wire type or lot
  const handleApplyBatchLot = () => {
    const updated = channels.map((c) => ({
      ...c,
      rollLotNumber: batchLotNumber,
      type: batchWireType,
      uses: batchUses,
    }));
    onUpdateChannels(updated);
    setBatchLotModalOpen(false);
  };

  const filteredChannels = channels.filter(
    (c) =>
      c.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.recorderChannel.toLowerCase().includes(filterQuery.toLowerCase()) ||
      `tc ${c.channelNumber}`.includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Action Header & AMS 2750 Template Buttons */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Thermocouple Channel Configuration & 6-Way Surface Clearances
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            AMS 2750 Rev H Table 17 & § 3.5.10.3: Enter exact physical distances from all 6 chamber surfaces (Left, Right, Front, Rear, Floor, Ceiling).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 text-xs">
            <span className="px-2 text-slate-400 font-medium">Standard Layouts:</span>
            <button
              onClick={() => handleResetStandard(9)}
              className="px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white font-mono font-bold transition-colors cursor-pointer"
              title="Standard 9-Point Pattern (8 Corners + 1 Center per AMS 2750 Rev H Fig 1)"
            >
              9-Point (Corner + Center)
            </button>
            <button
              onClick={() => handleResetStandard(14)}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-cyan-300 font-mono transition-colors cursor-pointer"
              title="14-Point Pattern (8 Corners + 1 Center + 5 Face Centers)"
            >
              14-Point (Balanced)
            </button>
          </div>

          {/* Clear / Re-number Channel Mapping Controls */}
          <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 text-xs gap-1">
            <button
              onClick={handleClearAllNumbering}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/70 text-amber-300 font-semibold transition-colors cursor-pointer"
              title="Clear all channel numbers on the Sensor Manager & Schematic so you can assign them to match your physical field instrument ports"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Clear All Numbering</span>
            </button>
            <button
              onClick={handleResetSequentialNumbering}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 font-medium transition-colors cursor-pointer"
              title="Number all sensors sequentially from 1 to N"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Number 1–{channels.length}</span>
            </button>
          </div>

          {/* Batch Wire / Lot */}
          <button
            onClick={() => setBatchLotModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Batch Wire/Lot
          </button>

          {/* Add Channel & View Mode Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle (Table vs Cards) */}
            <div className="hidden md:flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 text-xs">
              <button
                onClick={() => setActiveTab('table')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Compact Table
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'cards'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Detailed Cards
              </button>
            </div>

            <button
              onClick={() => {
                const balanced = balanceSensors(channels, chamber, qwz);
                onUpdateChannels(balanced);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Automatically snap all sensors to logical, symmetrical grid positions (Corners, Face Centers, Hub)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Balance Layout</span>
            </button>

            <button
              onClick={handleAddChannel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Channel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned Sensor Mapping Banner */}
      {channels.some((c) => c.channelNumber <= 0) && (
        <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Hash className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300">
                Custom Field Instrument Mapping Mode ({channels.filter((c) => c.channelNumber > 0).length} of {channels.length} sensors assigned):
              </span>{' '}
              Click any empty triangle <span className="font-mono font-bold text-white">△</span> on the 2D Schematic—or type the channel number directly into the <span className="font-mono font-bold text-amber-300">TC #</span> box—to match the port each sensor is plugged into on your field test instrument.
            </div>
          </div>
          <button
            onClick={handleResetSequentialNumbering}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            Auto-Fill 1–{channels.length}
          </button>
        </div>
      )}

      {/* Desktop Compact Table View (Fits 100% width with zero horizontal scrolling) */}
      {activeTab === 'table' && (
        <div className="hidden md:block bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-1 w-11 text-center">TC #</th>
                <th className="py-2.5 px-1.5">Location</th>
                <th className="py-2.5 px-1 w-14 text-center">Type</th>
                <th className="py-2.5 px-1 w-14 text-center">Rec</th>
                <th className="py-2.5 px-0.5 w-11 text-center text-amber-400" title="Distance to Left Wall">Left</th>
                <th className="py-2.5 px-0.5 w-11 text-center text-amber-400" title="Distance to Right Wall">Right</th>
                <th className="py-2.5 px-0.5 w-11 text-center text-amber-400" title="Distance to Front Door">Front</th>
                <th className="py-2.5 px-0.5 w-11 text-center text-amber-400" title="Distance to Rear Wall">Rear</th>
                <th className="py-2.5 px-0.5 w-11 text-center text-amber-400" title="Distance to Floor / Hearth">Floor</th>
                <th className="py-2.5 px-0.5 w-11 text-center text-amber-400" title="Distance to Ceiling / Roof">Ceil</th>
                <th className="py-2.5 px-1 w-20 text-center text-cyan-400">Lot #</th>
                <th className="py-2.5 px-0.5 w-10 text-center">Uses</th>
                <th className="py-2.5 px-1 w-14 text-center text-red-400" title="Sensor Failure Status (AMS 2750 Rev H § 3.5.13)">Status</th>
                <th className="py-2.5 px-1 w-12 text-center">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {filteredChannels.map((ch) => {
                const isSelected = ch.id === selectedChannelId;
                const isOverused = (ch.uses ?? 0) >= 90;
                return (
                  <tr
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-l-4 border-l-cyan-500 text-white'
                        : 'hover:bg-slate-800/40 text-slate-200'
                    }`}
                  >
                    {/* TC # (Editable Field Instrument Channel Number — Live Synced with Schematic) */}
                    <td className="py-1.5 px-1 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        placeholder="—"
                        value={ch.channelNumber > 0 ? ch.channelNumber : ''}
                        onFocus={() => onSelectChannel(ch.id)}
                        onChange={(e) => handleAssignChannelNumber(ch.id, e.target.value, false)}
                        onBlur={(e) => handleAssignChannelNumber(ch.id, e.target.value, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAssignChannelNumber(ch.id, (e.target as HTMLInputElement).value, true);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        title="Enter the Field Test Instrument Channel Number this sensor is plugged into (synced live with 2D Schematic)"
                        className={`w-full text-center font-mono font-bold text-[11px] px-1 py-1 rounded border focus:outline-none transition-colors ${
                          ch.channelNumber > 0
                            ? 'bg-slate-950 text-cyan-400 border-slate-700 focus:border-cyan-400'
                            : 'bg-amber-950/60 text-amber-300 border-amber-600/80 placeholder-amber-400/70 focus:border-amber-400'
                        }`}
                      />
                    </td>

                    {/* Label */}
                    <td className="py-1.5 px-1.5">
                      <input
                        type="text"
                        value={ch.label}
                        onFocus={() => onSelectChannel(ch.id)}
                        onChange={(e) => handleUpdateChannel(ch.id, { label: e.target.value })}
                        onBlur={() => handleCommitLabel(ch)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCommitLabel(ch);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={ch.label}
                        className="w-full bg-slate-950/60 border border-slate-700/60 rounded px-1.5 py-1 text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none truncate"
                      />
                    </td>

                    {/* Wire Type */}
                    <td className="py-1.5 px-1 text-center">
                      <select
                        value={ch.type}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { type: e.target.value as WireType })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded px-0.5 py-1 text-[11px] text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                      >
                        <option value="N">N</option>
                        <option value="K">K</option>
                        <option value="J">J</option>
                        <option value="E">E</option>
                        <option value="T">T</option>
                        <option value="M">M</option>
                        <option value="R">R</option>
                        <option value="S">S</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="RTD">RTD</option>
                      </select>
                    </td>

                    {/* Recorder Channel */}
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="text"
                        value={ch.recorderChannel}
                        onFocus={() => onSelectChannel(ch.id)}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { recorderChannel: e.target.value })
                        }
                        onBlur={(e) => handleCommitRecorderChannel(ch.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCommitRecorderChannel(ch.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950/60 border border-slate-700/60 rounded px-1 py-1 text-[10px] font-mono text-slate-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </td>

                    {/* Left Wall Distance */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={ch.distLeft}
                        onChange={(e) => handleDistanceChange(ch.id, 'distLeft', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded px-0.5 py-1 text-[11px] font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* Right Wall Distance */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={ch.distRight}
                        onChange={(e) => handleDistanceChange(ch.id, 'distRight', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded px-0.5 py-1 text-[11px] font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* Front Door Distance */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={ch.distFront}
                        onChange={(e) => handleDistanceChange(ch.id, 'distFront', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded px-0.5 py-1 text-[11px] font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* Rear Wall Distance */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={ch.distRear}
                        onChange={(e) => handleDistanceChange(ch.id, 'distRear', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded px-0.5 py-1 text-[11px] font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* Floor Distance */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={ch.distFloor}
                        onChange={(e) => handleDistanceChange(ch.id, 'distFloor', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded px-0.5 py-1 text-[11px] font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* Ceiling Distance */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={ch.distCeiling}
                        onChange={(e) => handleDistanceChange(ch.id, 'distCeiling', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded px-0.5 py-1 text-[11px] font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* Lot # */}
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="text"
                        value={ch.rollLotNumber}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { rollLotNumber: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        title={ch.rollLotNumber}
                        className="w-full text-center bg-slate-950/60 border border-slate-700/60 rounded px-1 py-1 text-[10px] font-mono text-slate-300 focus:border-cyan-500 focus:outline-none truncate"
                      />
                    </td>

                    {/* Uses */}
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="number"
                        value={ch.uses ?? 0}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { uses: parseInt(e.target.value, 10) || 0 })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full text-center bg-slate-950 border rounded px-0.5 py-1 text-[11px] font-mono focus:outline-none ${
                          isOverused ? 'border-red-500 text-red-400' : 'border-slate-700 text-slate-300'
                        }`}
                      />
                    </td>

                    {/* Status / Failed */}
                    <td className="py-1.5 px-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateChannel(ch.id, { failed: !ch.failed });
                        }}
                        className={`w-full py-1 rounded text-[10px] font-bold transition-all cursor-pointer shadow-sm ${
                          ch.failed
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        title={ch.failed ? 'Sensor marked FAILED / Open Circuit (AMS 2750 Rev H § 3.5.13)' : 'Click to mark sensor as FAILED (broken/open circuit)'}
                      >
                        {ch.failed ? 'FAIL' : 'Active'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-0.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateChannel(ch);
                          }}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Channel"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveChannel(ch.id);
                          }}
                          disabled={channels.length <= 1}
                          className="p-1 rounded hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove Channel"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Responsive Card Layout (Automatic on Mobile/iPad Portrait & Optional on Desktop) */}
      <div className={`${activeTab === 'cards' ? 'grid' : 'grid md:hidden'} grid-cols-1 sm:grid-cols-2 gap-3`}>
        {filteredChannels.map((ch) => {
          const isSelected = ch.id === selectedChannelId;
          const isOverused = (ch.uses ?? 0) >= 90;
          return (
            <div
              key={ch.id}
              onClick={() => onSelectChannel(ch.id)}
              className={`rounded-2xl border p-3.5 space-y-3 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/30 border-cyan-500 shadow-lg'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header: TC #, Label, Status, Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <div className="shrink-0">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">TC #</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      placeholder="—"
                      value={ch.channelNumber > 0 ? ch.channelNumber : ''}
                      onFocus={() => onSelectChannel(ch.id)}
                      onChange={(e) => handleAssignChannelNumber(ch.id, e.target.value, false)}
                      onBlur={(e) => handleAssignChannelNumber(ch.id, e.target.value, true)}
                      className={`w-14 text-center font-mono font-bold text-xs px-1.5 py-1 rounded-lg border focus:outline-none ${
                        ch.channelNumber > 0
                          ? 'bg-slate-950 text-cyan-400 border-slate-700'
                          : 'bg-amber-950/60 text-amber-300 border-amber-600/80'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Location Description</label>
                    <input
                      type="text"
                      value={ch.label}
                      onFocus={() => onSelectChannel(ch.id)}
                      onChange={(e) => handleUpdateChannel(ch.id, { label: e.target.value })}
                      onBlur={() => handleCommitLabel(ch)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end pb-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleUpdateChannel(ch.id, { failed: !ch.failed })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      ch.failed
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {ch.failed ? 'FAILED' : 'Active'}
                  </button>
                  <button
                    onClick={() => handleDuplicateChannel(ch)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveChannel(ch.id)}
                    disabled={channels.length <= 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 disabled:opacity-30 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Type, Recorder, Lot, Uses */}
              <div className="grid grid-cols-4 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase mb-0.5">Type</label>
                  <select
                    value={ch.type}
                    onChange={(e) => handleUpdateChannel(ch.id, { type: e.target.value as WireType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-amber-300 font-mono"
                  >
                    {['N', 'K', 'J', 'E', 'T', 'M', 'R', 'S', 'B', 'C', 'RTD'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase mb-0.5">Recorder</label>
                  <input
                    type="text"
                    value={ch.recorderChannel}
                    onChange={(e) => handleUpdateChannel(ch.id, { recorderChannel: e.target.value })}
                    onBlur={(e) => handleCommitRecorderChannel(ch.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-cyan-400 uppercase mb-0.5">Lot #</label>
                  <input
                    type="text"
                    value={ch.rollLotNumber}
                    onChange={(e) => handleUpdateChannel(ch.id, { rollLotNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase mb-0.5">Uses</label>
                  <input
                    type="number"
                    value={ch.uses ?? 0}
                    onChange={(e) => handleUpdateChannel(ch.id, { uses: parseInt(e.target.value, 10) || 0 })}
                    className={`w-full bg-slate-950 border rounded-lg px-2 py-1 text-xs font-mono text-center ${
                      isOverused ? 'border-red-500 text-red-400' : 'border-slate-700 text-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Row 3: 6-Way Clearances Grid */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  6-Way Chamber Clearances ({dimUnit})
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { key: 'distLeft', label: 'Left' },
                    { key: 'distRight', label: 'Right' },
                    { key: 'distFront', label: 'Front' },
                    { key: 'distRear', label: 'Rear' },
                    { key: 'distFloor', label: 'Floor' },
                    { key: 'distCeiling', label: 'Ceiling' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-[9px] text-slate-400 text-center mb-0.5">{f.label}</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={(ch as any)[f.key]}
                        onChange={(e) => handleDistanceChange(ch.id, f.key as any, e.target.value)}
                        className="w-full text-center bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Wire / Lot Modal */}
      {batchLotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Batch Apply Thermocouple Batch & Wire Type
            </h3>
            <p className="text-xs text-slate-400">
              Update wire type and calibration roll / lot batch number across all {channels.length} channels simultaneously.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Thermocouple Wire Type
                </label>
                <select
                  value={batchWireType}
                  onChange={(e) => setBatchWireType(e.target.value as WireType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="N">Type N (Nicrosil-Nisil — Base Metal)</option>
                  <option value="K">Type K (Chromel-Alumel — Base Metal)</option>
                  <option value="J">Type J (Iron-Constantan — Base Metal)</option>
                  <option value="E">Type E (Chromel-Constantan — Base Metal)</option>
                  <option value="T">Type T (Copper-Constantan — Base Metal)</option>
                  <option value="M">Type M (Ni-Mo / Ni-Co — Vacuum Base Metal)</option>
                  <option value="R">Type R (Pt / 13% Rh — Noble Metal)</option>
                  <option value="S">Type S (Pt / 10% Rh — Noble Metal)</option>
                  <option value="B">Type B (Pt-30% Rh / Pt-6% Rh — Noble Metal)</option>
                  <option value="C">Type C (W-5% Re / W-26% Re — Refractory)</option>
                  <option value="RTD">RTD (Resistance Temperature Detector)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Roll / Lot Batch Number
                </label>
                <input
                  type="text"
                  value={batchLotNumber}
                  onChange={(e) => setBatchLotNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Usage Count (Accumulated)
                </label>
                <input
                  type="number"
                  value={batchUses}
                  onChange={(e) => setBatchUses(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setBatchLotModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBatchLot}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shadow-md"
              >
                Apply to All Channels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
