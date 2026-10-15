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
} from 'lucide-react';
import { generateStandardAMS2750Sensors, computeSensorDistances } from '../utils/ams2750';

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
      rollLotNumber: `LOT-2026-N${100 + (nextNum % 4)}`,
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
            AMS 2750 Rev H Table 11: Enter exact physical distances from all 6 chamber surfaces (Left, Right, Front, Rear, Floor, Ceiling).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 text-xs">
            <span className="px-2 text-slate-400 font-medium">Standard Layouts:</span>
            <button
              onClick={() => handleResetStandard(21)}
              className="px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white font-mono font-bold transition-colors cursor-pointer"
              title="Exact 21-Point Web Pattern from Picture 1 (AMS 2750 Standard)"
            >
              21-Point (Picture 1)
            </button>
            <button
              onClick={() => handleResetStandard(9)}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-cyan-300 font-mono transition-colors cursor-pointer"
              title="Standard 9-Point Pattern (8 Corners + 1 Center per AMS 2750 Rev H Fig 1)"
            >
              9-Point
            </button>
            <button
              onClick={() => handleResetStandard(14)}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-cyan-300 font-mono transition-colors cursor-pointer"
              title="14-Point Pattern (9 Corners/Center + Face Centers)"
            >
              14-Point
            </button>
          </div>

          {/* Batch Wire / Lot */}
          <button
            onClick={() => setBatchLotModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Batch Wire/Lot
          </button>

          {/* Add Channel Button */}
          <button
            onClick={handleAddChannel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* Channels Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-16 text-center">TC #</th>
                <th className="py-3 px-3 w-48">Location Description</th>
                <th className="py-3 px-2 w-20 text-center">Type</th>
                <th className="py-3 px-2 w-24 text-center">Recorder</th>
                <th className="py-3 px-2 text-center text-amber-400">Left Wall</th>
                <th className="py-3 px-2 text-center text-amber-400">Right Wall</th>
                <th className="py-3 px-2 text-center text-amber-400">Front Door</th>
                <th className="py-3 px-2 text-center text-amber-400">Rear Wall</th>
                <th className="py-3 px-2 text-center text-amber-400">Floor</th>
                <th className="py-3 px-2 text-center text-amber-400">Ceiling</th>
                <th className="py-3 px-2 w-28 text-center text-cyan-400">Lot #</th>
                <th className="py-3 px-2 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredChannels.map((ch) => {
                const isSelected = ch.id === selectedChannelId;
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
                    {/* TC # */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {ch.channelNumber}
                      </span>
                    </td>

                    {/* Label */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={ch.label}
                        onChange={(e) => handleUpdateChannel(ch.id, { label: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                      />
                    </td>

                    {/* Wire Type */}
                    <td className="py-2.5 px-2 text-center">
                      <select
                        value={ch.type}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { type: e.target.value as WireType })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                      >
                        <option value="N">Type N</option>
                        <option value="K">Type K</option>
                        <option value="J">Type J</option>
                        <option value="R">Type R</option>
                        <option value="S">Type S</option>
                        <option value="B">Type B</option>
                        <option value="T">Type T</option>
                      </select>
                    </td>

                    {/* Recorder Channel */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="text"
                        value={ch.recorderChannel}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { recorderChannel: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 text-center bg-slate-950/60 border border-slate-700/60 rounded px-1.5 py-1 text-xs font-mono text-slate-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </td>

                    {/* Left Wall Distance */}
                    <td className="py-2.5 px-1.5 text-center">
                      <div className="relative inline-block w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ch.distLeft}
                          onChange={(e) => handleDistanceChange(ch.id, 'distLeft', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Right Wall Distance */}
                    <td className="py-2.5 px-1.5 text-center">
                      <div className="relative inline-block w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ch.distRight}
                          onChange={(e) => handleDistanceChange(ch.id, 'distRight', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Front Door Distance */}
                    <td className="py-2.5 px-1.5 text-center">
                      <div className="relative inline-block w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ch.distFront}
                          onChange={(e) => handleDistanceChange(ch.id, 'distFront', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Rear Wall Distance */}
                    <td className="py-2.5 px-1.5 text-center">
                      <div className="relative inline-block w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ch.distRear}
                          onChange={(e) => handleDistanceChange(ch.id, 'distRear', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Floor Distance */}
                    <td className="py-2.5 px-1.5 text-center">
                      <div className="relative inline-block w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ch.distFloor}
                          onChange={(e) => handleDistanceChange(ch.id, 'distFloor', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Ceiling Distance */}
                    <td className="py-2.5 px-1.5 text-center">
                      <div className="relative inline-block w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ch.distCeiling}
                          onChange={(e) => handleDistanceChange(ch.id, 'distCeiling', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Lot # */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="text"
                        value={ch.rollLotNumber}
                        onChange={(e) =>
                          handleUpdateChannel(ch.id, { rollLotNumber: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 text-center bg-slate-950/60 border border-slate-700/60 rounded px-1.5 py-1 text-xs font-mono text-slate-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateChannel(ch);
                          }}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Channel"
                        >
                          <Copy className="w-3.5 h-3.5" />
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
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                  <option value="N">Type N (Aerospace High Temp standard)</option>
                  <option value="K">Type K (Chromel-Alumel)</option>
                  <option value="J">Type J (Iron-Constantan)</option>
                  <option value="R">Type R (Platinum / 13% Rhodium)</option>
                  <option value="S">Type S (Platinum / 10% Rhodium)</option>
                  <option value="B">Type B (Platinum / 30% Rhodium)</option>
                  <option value="T">Type T (Copper-Constantan)</option>
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
