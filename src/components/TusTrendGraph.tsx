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
import { TusTrendData, DetectedDwellPeriod, ThermocoupleChannel, TempUnit, FurnaceClass } from '../types/tus';
import { CLASS_TOLERANCES } from '../utils/ams2750';

interface TusTrendGraphProps {
  data: TusTrendData[];
  dwells: DetectedDwellPeriod[];
  channels: ThermocoupleChannel[];
  tempUnit: TempUnit;
  furnaceClass: FurnaceClass;
  isZoomed?: boolean;
  showLegend?: boolean;
  hideTooltip?: boolean;
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
  furnaceClass,
  isZoomed = false,
  showLegend = true,
  hideTooltip = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div id="tus-trend-graph-container" className="flex flex-col items-center justify-center h-64 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
        <p>No CSV data available for trend visualization.</p>
        <p className="text-[10px]">Import a TUS log file to see the interactive trend.</p>
      </div>
    );
  }

  // To avoid performance issues with huge datasets, we can downsample if needed
  // But for typical TUS runs (a few thousand points), recharts should be okay.
  
  return (
    <div id={isZoomed ? undefined : "tus-trend-graph-container"} className={`w-full ${isZoomed ? 'h-[300px]' : 'h-[400px]'} bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-inner`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 60, right: 30, left: 0, bottom: isZoomed ? 10 : 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="timestampSec" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(val) => {
              const norm = ((val % 86400) + 86400) % 86400;
              const h = Math.floor(norm / 3600);
              const m = Math.floor((norm % 3600) / 60);
              return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }}
            stroke="#94a3b8" 
            fontSize={10}
            tick={{ fill: '#94a3b8' }}
            minTickGap={50}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tick={{ fill: '#94a3b8' }}
            label={isZoomed ? undefined : { value: `Temp (${tempUnit})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            domain={isZoomed ? ['auto', 'auto'] : undefined}
          />
          {!hideTooltip && (
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
              itemStyle={{ padding: '0px' }}
              labelFormatter={(val) => {
                const numVal = Number(val);
                const norm = ((numVal % 86400) + 86400) % 86400;
                const h = Math.floor(norm / 3600);
                const m = Math.floor((norm % 3600) / 60);
                return `Time: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              }}
            />
          )}
          {showLegend && <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />}
          
          {/* Highlight Dwell Periods & 30-min Evaluation Windows */}
          {dwells.map((dwell, idx) => {
            // Background Dwell (Dashed)
            const startSec = dwell.startTimeSec;
            const endSec = dwell.endTimeSec;
            
            // Evaluation Window (Highlighted Block)
            // Use evalStartTimeSec if available, fallback to startSec for robustness
            const evalStartSec = dwell.evalStartTimeSec ?? dwell.startTimeSec;
            const evalEndSec = dwell.evalEndTimeSec ?? dwell.endTimeSec;

            const furnaceClassNum = Number(furnaceClass) || 1;
            const classTolerance = CLASS_TOLERANCES[furnaceClassNum as FurnaceClass] || CLASS_TOLERANCES[1] || { '°F': 10, '°C': 6 };
            const unitKey = (tempUnit === '°F') ? '°F' : '°C';
            const tolerance = (classTolerance as any)[unitKey] ?? (unitKey === '°F' ? 10 : 6);
            const y1 = dwell.targetTemp - tolerance;
            const y2 = dwell.targetTemp + tolerance;

            return (
              <React.Fragment key={`dwell-group-${idx}`}>
                {/* Background Full Dwell Area */}
                {!isZoomed && (
                  <ReferenceArea
                    x1={startSec}
                    x2={endSec}
                    stroke="#334155"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    strokeOpacity={0.4}
                    fill="#1e293b"
                    fillOpacity={0.1}
                  />
                )}
                
                {/* Specific 30-min Evaluation Window (Vertical Band) */}
                <ReferenceArea
                  x1={evalStartSec}
                  x2={evalEndSec}
                  stroke="#a3e635"
                  strokeWidth={2}
                  fill="#a3e635"
                  fillOpacity={0.25}
                  label={{
                    position: 'top',
                    value: isZoomed ? `SETPOINT EVALUATION: ${dwell.targetTemp}${tempUnit} (±${tolerance})` : `SP${idx + 1}: ${dwell.targetTemp}${tempUnit}`,
                    fill: '#a3e635',
                    fontSize: 10,
                    fontWeight: 'bold',
                    offset: isZoomed ? 10 : 10 + (idx * 18)
                  }}
                />
              </React.Fragment>
            );
          })}

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
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
