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
  isZoomed?: boolean;
  showLegend?: boolean;
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
  isZoomed = false,
  showLegend = true,
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
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: isZoomed ? 10 : 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="timeStr" 
            stroke="#94a3b8" 
            fontSize={10}
            tick={{ fill: '#94a3b8' }}
            minTickGap={isZoomed ? 20 : 50}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tick={{ fill: '#94a3b8' }}
            label={isZoomed ? undefined : { value: `Temp (${tempUnit})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            domain={isZoomed ? ['auto', 'auto'] : undefined}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
            itemStyle={{ padding: '0px' }}
          />
          {showLegend && <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />}
          
          {/* Highlight Dwell Periods & 30-min Evaluation Windows */}
          {dwells.map((dwell, idx) => {
            const startT = dwell.startTimeStr || data[dwell.startIndex]?.timeStr || '';
            const endT = dwell.endTimeStr || data[dwell.endIndex]?.timeStr || '';
            
            const evalStartT = (dwell.evalStartIndex !== undefined) ? data[dwell.evalStartIndex]?.timeStr : null;
            const evalEndT = (dwell.evalEndIndex !== undefined) ? data[dwell.evalEndIndex]?.timeStr : null;

            return (
              <React.Fragment key={`dwell-group-${idx}`}>
                {/* Background Dwell Area */}
                {!isZoomed && (
                  <ReferenceArea
                    x1={startT}
                    x2={endT}
                    stroke="#334155"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    strokeOpacity={0.4}
                    fill="#1e293b"
                    fillOpacity={0.1}
                  />
                )}
                
                {/* Specific 30-min Evaluation Window (Requested Highlight) */}
                {evalStartT && evalEndT && (
                  <>
                    <ReferenceArea
                      x1={evalStartT}
                      x2={evalEndT}
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="#10b981"
                      fillOpacity={0.35} // Increased opacity
                      label={{
                        position: 'insideTop',
                        value: isZoomed ? `30-Min Capture (${dwell.targetTemp}${tempUnit})` : `Capture Window (${dwell.targetTemp}${tempUnit})`,
                        fill: '#10b981',
                        fontSize: 10,
                        fontWeight: 'bold',
                        offset: 15
                      }}
                    />
                    {/* Visual markers for start/end */}
                    <ReferenceLine x={evalStartT} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ position: 'left', value: 'Start', fill: '#059669', fontSize: 8 }} />
                    <ReferenceLine x={evalEndT} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ position: 'right', value: 'End', fill: '#059669', fontSize: 8 }} />
                  </>
                )}
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
              isAnimationActive={false} // Important for reliable html-to-image capture
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
