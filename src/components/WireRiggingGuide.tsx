import React, { useState } from 'react';
import {
  ThermocoupleChannel,
  QualifiedWorkZone,
  DimUnit,
} from '../types/tus';
import {
  getLogicalWireRiggingSchedule,
  WireRiggingCable,
} from '../utils/ams2750';
import {
  GitCommit,
  Layers,
  Ruler,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Maximize2,
  FileText,
  Printer,
  Compass,
  Info,
} from 'lucide-react';

interface WireRiggingGuideProps {
  channels: ThermocoupleChannel[];
  qwz: QualifiedWorkZone;
  dimUnit: DimUnit;
  onHighlightPair?: (numA: number, numB: number) => void;
}

export const WireRiggingGuide: React.FC<WireRiggingGuideProps> = ({
  channels,
  qwz,
  dimUnit,
  onHighlightPair,
}) => {
  const plan = getLogicalWireRiggingSchedule(channels, dimUnit);
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | '3d-diagonal' | 'perimeter-frame' | 'depth-rail' | 'face-brace'
  >('all');

  const filteredCables =
    selectedCategory === 'all'
      ? plan.cables
      : plan.cables.filter((c) => c.category === selectedCategory);

  const totalWireLength = Math.round(
    plan.cables.reduce((acc, c) => acc + c.cutLength, 0)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner: Opposite-Corner Wire Rigging Philosophy */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-950/80 border border-blue-800/60 rounded-xl text-blue-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  Physical Wire Grid Assembly & Rigging Protocol
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold uppercase">
                  Opposite-Corner 3D Web
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Engineering cutting list and assembly order to physically rig the thermocouple web inside the furnace or work basket.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono">
              <span className="text-slate-400">Total Rigging Wire: </span>
              <strong className="text-cyan-400">
                {totalWireLength} {dimUnit} ({(totalWireLength / 1000).toFixed(2)} m)
              </strong>
            </div>
          </div>
        </div>

        {/* 1. The 4 Main 3D Cross-Body Diagonals (Opposite Corners) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Primary Backbone: 4 Opposite-Corner 3D Tension Diagonals
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              All 4 diagonals intersect at Center Hub TC {plan.oppositeCornerDiagonals[0]?.center.channelNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.oppositeCornerDiagonals.map((diag, index) => (
              <div
                key={diag.id}
                className="bg-slate-950 border border-slate-800 hover:border-blue-700/60 rounded-xl p-3.5 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                    <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-700 text-blue-300 text-[10px] flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    {diag.title}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    {diag.totalSpanLength} {dimUnit}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-slate-200 font-mono">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">Start Corner</span>
                    <strong className="text-cyan-400">TC {diag.cornerA.channelNumber}</strong>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <div className="text-center">
                    <span className="text-[10px] text-amber-500 block">Central Hub Ring</span>
                    <strong className="text-amber-300">TC {diag.center.channelNumber} (Center)</strong>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">Opposite Corner</span>
                    <strong className="text-cyan-400">TC {diag.cornerB.channelNumber}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {diag.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Step-by-Step Shop-Floor Assembly Instructions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Standard Physical Assembly Sequence (Shop Floor Instructions)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Rigging Inconel / Stainless Wire Rope</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold text-[10px] flex items-center justify-center">
                1
              </span>
              <strong className="text-slate-200">Cut 4 Main Diagonals</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Pre-cut 4 continuous lengths of tie-wire to the 3D span length (
              <strong>{plan.oppositeCornerDiagonals[0]?.totalSpanLength} {dimUnit}</strong> + 150mm tie allowance at each end).
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold text-[10px] flex items-center justify-center">
                2
              </span>
              <strong className="text-slate-200">Tension Through Center Hub</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Thread all 4 diagonal cables through the central junction ring (Center TC hub). Secure opposite corners diagonally across the 3D work zone.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold text-[10px] flex items-center justify-center">
                3
              </span>
              <strong className="text-slate-200">Run 12 Perimeter Rails</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              String the 12 outer frame perimeter wires (Front 4 edges, Rear 4 edges, and 4 longitudinal depth rails) to form the rigid boundary cage.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold text-[10px] flex items-center justify-center">
                4
              </span>
              <strong className="text-slate-200">Attach Probes & Verify</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tie thermocouple sensing beads to the wire junction points with inconel wire. Measure and verify clearances ($a$, $b$, etc.) before survey start.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Detailed Cable Cutting Schedule Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Complete Cable Cutting List & Rigging Schedule ({plan.cables.length} Wire Segments)
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'All Cables' },
              { id: '3d-diagonal', label: '3D Diagonals' },
              { id: 'perimeter-frame', label: 'Perimeter Box' },
              { id: 'depth-rail', label: 'Depth Rails' },
              { id: 'face-brace', label: 'Face Braces' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedCategory(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === f.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">Rigging Wire Segment</th>
                <th className="py-2.5 px-4">From Sensor</th>
                <th className="py-2.5 px-4">To Sensor</th>
                <th className="py-2.5 px-4 text-right">Cut Length ({dimUnit})</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Rigging Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredCables.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-4 text-slate-500 font-bold">{c.stepNumber}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-100">{c.title}</td>
                  <td className="py-2.5 px-4 text-cyan-400">TC {c.fromChannelNum}</td>
                  <td className="py-2.5 px-4 text-cyan-400">TC {c.toChannelNum}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                    {c.cutLength} {dimUnit}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.category === '3d-diagonal'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : c.category === 'perimeter-frame'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : c.category === 'depth-rail'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {c.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px]">
                    {c.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
