import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { TusTrendData, DetectedDwellPeriod, ThermocoupleChannel, TempUnit } from '../types/tus';

interface TusTrendGraphProps {
  data: TusTrendData[];
  dwells: DetectedDwellPeriod[];
  channels: ThermocoupleChannel[];
  tempUnit: TempUnit;
}

const COLORS = [
  '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#818cf8', 
  '#c084fc', '#fb7185', '#a3e635', '#2dd4bf', '#60a5fa'
];

export const TusTrendGraph: React.FC<TusTrendGraphProps> = ({
  data,
  dwells,
  channels,
  tempUnit,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
        <p>No CSV data available for trend visualization.</p>
        <p className="text-[10px]">Import a TUS log file to see the interactive trend.</p>
      </div>
    );
  }

  // To avoid performance issues with huge datasets, we can downsample if needed
  // But for typical TUS runs (a few thousand points), recharts should be okay.
  
  return (
    <div id="tus-trend-graph-container" className="w-full h-[400px] bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-inner">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="timeStr" 
            stroke="#94a3b8" 
            fontSize={10}
            tick={{ fill: '#94a3b8' }}
            minTickGap={50}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tick={{ fill: '#94a3b8' }}
            label={{ value: `Temp (${tempUnit})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
            itemStyle={{ padding: '0px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          
          {/* Highlight Dwell Periods */}
          {dwells.map((dwell, idx) => (
            <ReferenceArea
              key={`dwell-${idx}`}
              x1={data[dwell.startIndex]?.timeStr}
              x2={data[dwell.endIndex]?.timeStr}
              strokeOpacity={0.3}
              fill="#10b981"
              fillOpacity={0.1}
              label={{ position: 'top', value: `${dwell.targetTemp}${tempUnit} Dwell`, fill: '#10b981', fontSize: 10, fontWeight: 'bold' }}
            />
          ))}

          {/* Render lines for mapped channels */}
          {channels.map((ch, idx) => (
            <Line
              key={ch.id}
              type="monotone"
              dataKey={ch.id}
              name={`TC ${ch.channelNumber}`}
              stroke={COLORS[idx % COLORS.length]}
              dot={false}
              strokeWidth={1.5}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
