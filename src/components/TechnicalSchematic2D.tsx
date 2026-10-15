import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  DimUnit,
} from '../types/tus';
import { getLogicalWireRiggingSchedule } from '../utils/ams2750';
import {
  Camera,
  Layers,
  Eye,
  RotateCw,
  Compass,
  Sliders,
  Ruler,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

interface TechnicalSchematic2DProps {
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  channels: ThermocoupleChannel[];
  dimUnit: DimUnit;
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onExportImageReady?: (dataUrl: string) => void;
}

export const TechnicalSchematic2D: React.FC<TechnicalSchematic2DProps> = ({
  chamber,
  qwz,
  channels,
  dimUnit,
  selectedChannelId,
  onSelectChannel,
  onExportImageReady,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Orientation settings matching Picture 1 standard:
  // Azimuth: Angle around vertical axis (around 32 degrees)
  // Elevation: Angle looking down from above (around 22 degrees)
  const [azimuthDeg, setAzimuthDeg] = useState(33);
  const [elevationDeg, setElevationDeg] = useState(20);
  const [zoom, setZoom] = useState(1.0);
  const [isWhiteTheme, setIsWhiteTheme] = useState(true); // Default to clean white background as in Picture 1
  const [showDimensions, setShowDimensions] = useState(true);
  const [showWireGrid, setShowWireGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);

  // SVG canvas dimensions
  const svgWidth = 860;
  const svgHeight = 640;
  const originX = svgWidth / 2 - 20;
  const originY = svgHeight / 2 + 10;

  // Normalization scale factor so any furnace size (mm or in) fits comfortably
  const scale = useMemo(() => {
    const maxChamber = Math.max(chamber.length, chamber.width, chamber.height, 100);
    const maxQWZ = Math.max(
      qwz.offsetFront + qwz.length + qwz.offsetRear,
      qwz.offsetLeft + qwz.width + qwz.offsetRight,
      qwz.offsetFloor + qwz.height + qwz.offsetCeiling,
      qwz.length,
      qwz.width,
      qwz.height,
      100
    );
    const maxDim = Math.max(maxChamber, maxQWZ);
    return (380 / maxDim) * zoom;
  }, [chamber, qwz, zoom]);

  // Convert 3D furnace coordinates (x = Depth/Length, y = Height, z = Width) to 2D screen coordinates (sx, sy)
  // Matching the projection of Picture 1:
  // Front face faces forward-left.
  // Right wall recedes back-right.
  // Top is viewed from above.
  const project3Dto2D = useCallback(
    (x: number, y: number, z: number) => {
      // Centered 3D coordinates based on actual furnace envelope:
      const midX = Math.max(chamber.length, qwz.offsetFront + qwz.length) / 2;
      const midY = Math.max(chamber.height, qwz.offsetFloor + qwz.height) / 2;
      const midZ = Math.max(chamber.width, qwz.offsetLeft + qwz.width) / 2;

      const cx = x - midX;
      const cy = y - midY;
      const cz = z - midZ;

      const azRad = (azimuthDeg * Math.PI) / 180;
      const elRad = (elevationDeg * Math.PI) / 180;

      // Rotate around Y axis (azimuth):
      // X = depth, Z = width
      const rotX = cx * Math.cos(azRad) - cz * Math.sin(azRad);
      const rotZ = cx * Math.sin(azRad) + cz * Math.cos(azRad);

      // Rotate around X axis (elevation):
      const rotY = cy * Math.cos(elRad) - rotZ * Math.sin(elRad);
      const depth = cy * Math.sin(elRad) + rotZ * Math.cos(elRad);

      // Axonometric / isometric projection (parallel):
      const screenX = originX + rotX * scale;
      const screenY = originY - rotY * scale;

      return { x: screenX, y: screenY, depth };
    },
    [chamber, qwz, azimuthDeg, elevationDeg, scale, originX, originY]
  );

  // 1. Calculate Chamber 8 Vertices
  // Coordinates:
  // x: 0 = Front, chamber.length = Rear
  // y: 0 = Floor, chamber.height = Ceiling
  // z: 0 = Left, chamber.width = Right
  const cL = chamber.length;
  const cW = chamber.width;
  const cH = chamber.height;

  const chamberVertices = useMemo(() => {
    return {
      // Front Face
      fTL: project3Dto2D(0, cH, 0),    // 0: Front Top Left
      fTR: project3Dto2D(0, cH, cW),   // 1: Front Top Right
      fBR: project3Dto2D(0, 0, cW),    // 2: Front Bottom Right
      fBL: project3Dto2D(0, 0, 0),     // 3: Front Bottom Left
      // Rear Face
      rTL: project3Dto2D(cL, cH, 0),   // 4: Rear Top Left
      rTR: project3Dto2D(cL, cH, cW),  // 5: Rear Top Right
      rBR: project3Dto2D(cL, 0, cW),   // 6: Rear Bottom Right
      rBL: project3Dto2D(cL, 0, 0),    // 7: Rear Bottom Left
    };
  }, [project3Dto2D, cL, cW, cH]);

  // 2. Calculate Qualified Work Zone (QWZ) 8 Vertices
  const qx1 = qwz.offsetFront;
  const qx2 = qwz.offsetFront + qwz.length;
  const qy1 = qwz.offsetFloor;
  const qy2 = qwz.offsetFloor + qwz.height;
  const qz1 = qwz.offsetLeft;
  const qz2 = qwz.offsetLeft + qwz.width;

  const qwzVertices = useMemo(() => {
    return {
      fTL: project3Dto2D(qx1, qy2, qz1),
      fTR: project3Dto2D(qx1, qy2, qz2),
      fBR: project3Dto2D(qx1, qy1, qz2),
      fBL: project3Dto2D(qx1, qy1, qz1),
      rTL: project3Dto2D(qx2, qy2, qz1),
      rTR: project3Dto2D(qx2, qy2, qz2),
      rBR: project3Dto2D(qx2, qy1, qz2),
      rBL: project3Dto2D(qx2, qy1, qz1),
    };
  }, [project3Dto2D, qx1, qx2, qy1, qy2, qz1, qz2]);

  // 3. Projected 2D Points for all Thermocouples
  const projectedChannels = useMemo(() => {
    return channels.map((ch) => {
      const p = project3Dto2D(ch.x, ch.y, ch.z);
      return {
        ...ch,
        px: p.x,
        py: p.y,
        depth: p.depth,
      };
    });
  }, [channels, project3Dto2D]);

  // 4. Physical Wire Grid Connections (Logical Opposite-Corner Diagonals & Perimeter)
  const wireRiggingPlan = useMemo(() => {
    return getLogicalWireRiggingSchedule(channels, dimUnit);
  }, [channels, dimUnit]);

  const wireConnections = useMemo(() => {
    return wireRiggingPlan.cables.map((cable) => {
      const pa = project3Dto2D(cable.pair[0].x, cable.pair[0].y, cable.pair[0].z);
      const pb = project3Dto2D(cable.pair[1].x, cable.pair[1].y, cable.pair[1].z);
      return {
        id: cable.id,
        category: cable.category,
        title: cable.title,
        description: cable.description,
        cutLength: cable.cutLength,
        fromNum: cable.fromChannelNum,
        toNum: cable.toChannelNum,
        x1: pa.x,
        y1: pa.y,
        x2: pb.x,
        y2: pb.y,
      };
    });
  }, [wireRiggingPlan, project3Dto2D]);

  // Capture High-Res PNG image of the SVG for Word Report export
  const exportImage = useCallback(() => {
    if (!svgRef.current) return '';
    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const canvas = document.createElement('canvas');
      // Render at 2x resolution for ultra-crisp report embedding
      const exportWidth = 1600;
      const exportHeight = 1100;
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportWidth, exportHeight);
        ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
        const dataUrl = canvas.toDataURL('image/png');
        URLObj.revokeObjectURL(blobURL);

        if (onExportImageReady) {
          onExportImageReady(dataUrl);
        }
        setCaptureFeedback('2D CAD Diagram Captured for Word Report!');
        setTimeout(() => setCaptureFeedback(null), 2500);
      };
      img.src = blobURL;
    } catch (e) {
      console.error('Failed to export 2D SVG image:', e);
    }
  }, [onExportImageReady]);

  // Trigger initial export after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      exportImage();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Preset Angle Handlers
  const handleSetPreset = (preset: 'picture1' | 'frontRight' | 'frontLeft' | 'top') => {
    if (preset === 'picture1') {
      setAzimuthDeg(33);
      setElevationDeg(20);
      setZoom(1.0);
    } else if (preset === 'frontRight') {
      setAzimuthDeg(45);
      setElevationDeg(30);
      setZoom(1.0);
    } else if (preset === 'frontLeft') {
      setAzimuthDeg(-35);
      setElevationDeg(25);
      setZoom(1.0);
    } else if (preset === 'top') {
      setAzimuthDeg(0);
      setElevationDeg(85);
      setZoom(0.9);
    }
    setTimeout(exportImage, 300);
  };

  // Helper to construct SVG polygon path
  const pts = (...coords: Array<{ x: number; y: number }>) => {
    return coords.map((c) => `${c.x},${c.y}`).join(' ');
  };

  // Selected channel details
  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];
  const selectedProj = selectedChannel ? project3Dto2D(selectedChannel.x, selectedChannel.y, selectedChannel.z) : null;

  return (
    <div
      className={`relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border shadow-2xl flex flex-col transition-colors ${
        isWhiteTheme
          ? 'bg-white border-slate-300 text-slate-800'
          : 'bg-slate-950 border-slate-800 text-slate-100'
      }`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {/* Title & Style Badge */}
        <div
          className={`pointer-events-auto rounded-xl px-3.5 py-2 text-xs flex items-center gap-3 shadow-md border ${
            isWhiteTheme
              ? 'bg-slate-100/95 border-slate-300 text-slate-900'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-blue-600">
            <Layers className="w-4 h-4" />
            <span>2D ISOMETRIC SCHEMATIC (AMS 2750 / PICTURE 1)</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold" title="Qualified Work Zone Dimensions">
            QWZ: {qwz.length} × {qwz.width} × {qwz.height} {dimUnit} (
            {dimUnit === 'mm'
              ? `${((qwz.length * qwz.width * qwz.height) / 1_000_000_000).toFixed(2)} m³`
              : `${((qwz.length * qwz.width * qwz.height) / 1728).toFixed(1)} ft³`}
            )
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-emerald-600 font-bold">
            {channels.length} Thermocouples (Wire Web Active)
          </span>
        </div>

        {/* View Angle Presets & Export Actions */}
        <div
          className={`pointer-events-auto flex items-center gap-1.5 rounded-xl p-1 shadow-md border ${
            isWhiteTheme
              ? 'bg-slate-100/95 border-slate-300'
              : 'bg-slate-900/90 border-slate-700'
          }`}
        >
          <button
            onClick={() => handleSetPreset('picture1')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-500 cursor-pointer"
            title="Exact orientation and layout as Picture 1"
          >
            Picture 1 Standard
          </button>
          <button
            onClick={() => handleSetPreset('frontRight')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Isometric 45°
          </button>
          <button
            onClick={() => handleSetPreset('top')}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Plan View
          </button>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Theme Toggle (Drafting White vs Dark Blueprint) */}
          <button
            onClick={() => setIsWhiteTheme(!isWhiteTheme)}
            className={`p-1.5 rounded-lg cursor-pointer ${
              isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle White Drafting Canvas / Dark Mode"
          >
            {isWhiteTheme ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          {/* Export CAD button */}
          <button
            onClick={exportImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
            title="Capture high-resolution 2D CAD schematic for Word document"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture 2D CAD</span>
          </button>
        </div>
      </div>

      {/* Capture Feedback Notification */}
      {captureFeedback && (
        <div className="absolute top-16 right-4 z-20 bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xl animate-fade-in flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>{captureFeedback}</span>
        </div>
      )}

      {/* SVG Canvas Rendering 2D Isometric Technical Schematic */}
      <div className="w-full flex-1 relative overflow-auto flex items-center justify-center p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-w-[1100px] select-none"
          style={{
            fontFamily: '"JetBrains Mono", Arial, sans-serif',
          }}
        >
          <defs>
            {/* Arrow marker for dimension callouts */}
            <marker
              id="arrow-blue-end"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 8 4, 0 7" fill="#2563EB" />
            </marker>
            <marker
              id="arrow-blue-start"
              markerWidth="8"
              markerHeight="8"
              refX="2"
              refY="4"
              orient="auto"
            >
              <polygon points="8 1, 0 4, 8 7" fill="#2563EB" />
            </marker>

            {/* Subtle drop shadow for triangles */}
            <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background */}
          <rect
            width={svgWidth}
            height={svgHeight}
            fill={isWhiteTheme ? '#FFFFFF' : '#0B1120'}
          />

          {/* ----------------------------------------------------------- */}
          {/* 1. HIDDEN CHAMBER EDGES (Dashed lines as in Picture 1)     */}
          {/* Rear-Bottom edges, Left-Rear vertical post                  */}
          {/* ----------------------------------------------------------- */}
          <g
            stroke={isWhiteTheme ? '#000000' : '#64748B'}
            strokeWidth="2.2"
            strokeDasharray="6,5"
            fill="none"
          >
            {/* Left-Rear vertical post: rTL -> rBL */}
            <line
              x1={chamberVertices.rTL.x}
              y1={chamberVertices.rTL.y}
              x2={chamberVertices.rBL.x}
              y2={chamberVertices.rBL.y}
            />
            {/* Bottom-Rear edge: rBL -> rBR */}
            <line
              x1={chamberVertices.rBL.x}
              y1={chamberVertices.rBL.y}
              x2={chamberVertices.rBR.x}
              y2={chamberVertices.rBR.y}
            />
            {/* Bottom-Left edge: fBL -> rBL */}
            <line
              x1={chamberVertices.fBL.x}
              y1={chamberVertices.fBL.y}
              x2={chamberVertices.rBL.x}
              y2={chamberVertices.rBL.y}
            />
          </g>

          {/* ----------------------------------------------------------- */}
          {/* 2. QUALIFIED WORK ZONE (QWZ) BOX (Peach Tint as in Picture 1)*/}
          {/* ----------------------------------------------------------- */}
          <g>
            {/* Rear Face of QWZ */}
            <polygon
              points={pts(qwzVertices.rTL, qwzVertices.rTR, qwzVertices.rBR, qwzVertices.rBL)}
              fill={isWhiteTheme ? 'rgba(254, 237, 222, 0.45)' : 'rgba(249, 115, 22, 0.08)'}
            />

            {/* Left Face of QWZ */}
            <polygon
              points={pts(qwzVertices.fTL, qwzVertices.rTL, qwzVertices.rBL, qwzVertices.fBL)}
              fill={isWhiteTheme ? 'rgba(254, 237, 222, 0.55)' : 'rgba(249, 115, 22, 0.12)'}
            />

            {/* Floor / Bottom Face of QWZ */}
            <polygon
              points={pts(qwzVertices.fBL, qwzVertices.fBR, qwzVertices.rBR, qwzVertices.rBL)}
              fill={isWhiteTheme ? 'rgba(254, 232, 215, 0.7)' : 'rgba(249, 115, 22, 0.15)'}
            />

            {/* Right Face of QWZ */}
            <polygon
              points={pts(qwzVertices.fTR, qwzVertices.rTR, qwzVertices.rBR, qwzVertices.fBR)}
              fill={isWhiteTheme ? 'rgba(254, 243, 235, 0.85)' : 'rgba(249, 115, 22, 0.18)'}
            />

            {/* Top Face of QWZ */}
            <polygon
              points={pts(qwzVertices.fTL, qwzVertices.fTR, qwzVertices.rTR, qwzVertices.rTL)}
              fill={isWhiteTheme ? 'rgba(255, 247, 240, 0.9)' : 'rgba(249, 115, 22, 0.22)'}
            />

            {/* Front Face of QWZ */}
            <polygon
              points={pts(qwzVertices.fTL, qwzVertices.fTR, qwzVertices.fBR, qwzVertices.fBL)}
              fill={isWhiteTheme ? 'rgba(254, 240, 230, 0.75)' : 'rgba(249, 115, 22, 0.15)'}
            />

            {/* QWZ Boundary Wire Outline */}
            <g stroke={isWhiteTheme ? '#B45309' : '#F97316'} strokeWidth="1.6" fill="none" opacity="0.85">
              {/* Front Frame */}
              <polygon points={pts(qwzVertices.fTL, qwzVertices.fTR, qwzVertices.fBR, qwzVertices.fBL)} />
              {/* Rear Frame */}
              <polygon points={pts(qwzVertices.rTL, qwzVertices.rTR, qwzVertices.rBR, qwzVertices.rBL)} />
              {/* Connecting Length Edges */}
              <line x1={qwzVertices.fTL.x} y1={qwzVertices.fTL.y} x2={qwzVertices.rTL.x} y2={qwzVertices.rTL.y} />
              <line x1={qwzVertices.fTR.x} y1={qwzVertices.fTR.y} x2={qwzVertices.rTR.x} y2={qwzVertices.rTR.y} />
              <line x1={qwzVertices.fBR.x} y1={qwzVertices.fBR.y} x2={qwzVertices.rBR.x} y2={qwzVertices.rBR.y} />
              <line x1={qwzVertices.fBL.x} y1={qwzVertices.fBL.y} x2={qwzVertices.rBL.x} y2={qwzVertices.rBL.y} />
            </g>
          </g>

          {/* ----------------------------------------------------------- */}
          {/* 3. PHYSICAL WIRE GRID / WEB STRUCTURE (Opposite-Corner 3D Web & Perimeter Frame) */}
          {showWireGrid && (
            <g strokeLinecap="round">
              {wireConnections.map((wire) => {
                const is3DDiag = wire.category === '3d-diagonal';
                const isFrame = wire.category === 'perimeter-frame' || wire.category === 'depth-rail';

                // 3D opposite-corner tension diagonals have prominent technical blue styling
                const strokeColor = is3DDiag
                  ? isWhiteTheme
                    ? '#2563EB'
                    : '#38BDF8'
                  : isFrame
                  ? isWhiteTheme
                    ? '#475569'
                    : '#94A3B8'
                  : isWhiteTheme
                  ? '#94A3B8'
                  : '#64748B';

                const strokeWidth = is3DDiag ? 2.4 : isFrame ? 1.8 : 1.2;
                const strokeDash = is3DDiag ? 'none' : isFrame ? 'none' : '4,3';

                return (
                  <g key={wire.id}>
                    <line
                      x1={wire.x1}
                      y1={wire.y1}
                      x2={wire.x2}
                      y2={wire.y2}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      opacity={is3DDiag ? 1.0 : isFrame ? 0.9 : 0.75}
                    />
                    <title>
                      {wire.title} (Cut Length: {wire.cutLength} {dimUnit}) — {wire.description}
                    </title>
                  </g>
                );
              })}
            </g>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 4. VISIBLE CHAMBER EDGES (Solid black lines as in Picture 1)*/}
          {/* Front face, Right wall, Top face, Front bottom edge         */}
          {/* ----------------------------------------------------------- */}
          <g
            stroke={isWhiteTheme ? '#000000' : '#E2E8F0'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Front Face: fTL -> fTR -> fBR -> fBL -> fTL */}
            <polygon
              points={pts(
                chamberVertices.fTL,
                chamberVertices.fTR,
                chamberVertices.fBR,
                chamberVertices.fBL
              )}
            />

            {/* Top Face: fTL -> rTL -> rTR -> fTR */}
            <line
              x1={chamberVertices.fTL.x}
              y1={chamberVertices.fTL.y}
              x2={chamberVertices.rTL.x}
              y2={chamberVertices.rTL.y}
            />
            <line
              x1={chamberVertices.rTL.x}
              y1={chamberVertices.rTL.y}
              x2={chamberVertices.rTR.x}
              y2={chamberVertices.rTR.y}
            />
            <line
              x1={chamberVertices.rTR.x}
              y1={chamberVertices.rTR.y}
              x2={chamberVertices.fTR.x}
              y2={chamberVertices.fTR.y}
            />

            {/* Right Face: fTR -> rTR -> rBR -> fBR */}
            <line
              x1={chamberVertices.rTR.x}
              y1={chamberVertices.rTR.y}
              x2={chamberVertices.rBR.x}
              y2={chamberVertices.rBR.y}
            />
            <line
              x1={chamberVertices.fBR.x}
              y1={chamberVertices.fBR.y}
              x2={chamberVertices.rBR.x}
              y2={chamberVertices.rBR.y}
            />
          </g>

          {/* ----------------------------------------------------------- */}
          {/* 5. DIMENSION ARROWS & CALLOUTS (a, b from Picture 1)        */}
          {/* ----------------------------------------------------------- */}
          {showDimensions && (
            <g>
              {/* Arrow 'a': Distance to Right Wall from TC 19/Right QWZ boundary */}
              {(() => {
                // Point on right edge of QWZ and right wall of chamber
                const qRightPt = qwzVertices.rBR;
                const wallRightPt = chamberVertices.rBR;
                const midX = (qRightPt.x + wallRightPt.x) / 2;
                const arrowY = qRightPt.y - 45;

                return (
                  <g>
                    {/* Dimension Arrow 'a' */}
                    <line
                      x1={qRightPt.x + 2}
                      y1={arrowY}
                      x2={wallRightPt.x - 2}
                      y2={arrowY}
                      stroke="#2563EB"
                      strokeWidth="1.6"
                      markerStart="url(#arrow-blue-start)"
                      markerEnd="url(#arrow-blue-end)"
                    />
                    {/* Dimension Label 'a' */}
                    <text
                      x={midX}
                      y={arrowY - 6}
                      fill="#2563EB"
                      fontSize="13"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      a = {qwz.offsetRight} {dimUnit}
                    </text>
                  </g>
                );
              })()}

              {/* Arrow 'b': Distance to Floor/Hearth from TC 19/QWZ Bottom */}
              {(() => {
                const qBottomPt = qwzVertices.fBR;
                const floorPt = chamberVertices.fBR;
                const arrowX = qBottomPt.x - 30;

                return (
                  <g>
                    {/* Dimension Arrow 'b' */}
                    <line
                      x1={arrowX}
                      y1={floorPt.y - 2}
                      x2={arrowX}
                      y2={qBottomPt.y + 2}
                      stroke="#2563EB"
                      strokeWidth="1.6"
                      markerStart="url(#arrow-blue-start)"
                      markerEnd="url(#arrow-blue-end)"
                    />
                    {/* Dimension Label 'b' */}
                    <text
                      x={arrowX - 8}
                      y={(floorPt.y + qBottomPt.y) / 2 + 4}
                      fill="#2563EB"
                      fontSize="13"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      b = {qwz.offsetFloor} {dimUnit}
                    </text>
                  </g>
                );
              })()}

              {/* Selected TC Clearance Callout Badge (if specific channel selected) */}
              {selectedChannel && selectedProj && (
                <g>
                  {/* Subtle target circle */}
                  <circle
                    cx={selectedProj.x}
                    cy={selectedProj.y}
                    r="18"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                  />
                </g>
              )}
            </g>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 6. THERMOCOUPLE SENSOR MARKERS (Upright Triangles as in Picture 1) */}
          {/* Triangular badge △ with white fill, black border, number    */}
          {/* ----------------------------------------------------------- */}
          <g>
            {projectedChannels.map((ch) => {
              const isSelected = ch.id === selectedChannelId;
              const tx = ch.px;
              const ty = ch.py;
              // Triangle dimensions
              const size = isSelected ? 16 : 14;
              const topY = ty - size * 0.95;
              const leftX = tx - size;
              const rightX = tx + size;
              const bottomY = ty + size * 0.75;

              return (
                <g
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className="cursor-pointer group"
                >
                  {/* Triangle Path: Peak at (tx, topY), bottom-right (rightX, bottomY), bottom-left (leftX, bottomY) */}
                  <polygon
                    points={`${tx},${topY} ${rightX},${bottomY} ${leftX},${bottomY}`}
                    fill={isSelected ? '#FEF08A' : '#FFFFFF'}
                    stroke={isSelected ? '#DC2626' : '#000000'}
                    strokeWidth={isSelected ? '2.4' : '1.8'}
                    strokeLinejoin="round"
                    filter="url(#badge-shadow)"
                  />

                  {/* Channel Number Text Centered inside Triangle */}
                  <text
                    x={tx}
                    y={ty + 3}
                    textAnchor="middle"
                    fill={isSelected ? '#991B1B' : '#000000'}
                    fontSize={ch.channelNumber > 9 ? '10' : '11.5'}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {ch.channelNumber}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Legend / Title in lower left */}
          <g transform="translate(24, 580)">
            <text
              x="0"
              y="0"
              fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}
              fontSize="12"
              fontWeight="bold"
            >
              FIGURE 1: AMS 2750 REV H TUS WIRE GRID & TC SENSOR MAP
            </text>
            <text
              x="0"
              y="16"
              fill={isWhiteTheme ? '#475569' : '#94A3B8'}
              fontSize="10"
            >
              △ Thermocouple Positions • Blue: 4 Main Opposite-Corner 3D Diagonals • Slate: 12 Perimeter Rails
            </text>
            <text
              x="0"
              y="30"
              fill={isWhiteTheme ? '#2563EB' : '#60A5FA'}
              fontSize="10"
              fontWeight="bold"
            >
              a = Right wall clearance ({qwz.offsetRight} {dimUnit}) • b = Hearth/Floor clearance ({qwz.offsetFloor} {dimUnit})
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Floating Control Dock */}
      <div
        className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-300 text-slate-700'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        {/* Layer Toggles */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
            Display:
          </span>

          <button
            onClick={() => setShowWireGrid(!showWireGrid)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              showWireGrid
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-transparent border-slate-400 text-slate-500'
            }`}
          >
            Wire Grid Web
          </button>

          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              showDimensions
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-transparent border-slate-400 text-slate-500'
            }`}
          >
            Offset Arrows (a, b)
          </button>
        </div>

        {/* Orientation & Zoom Fine-tuning Sliders */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Angle:</span>
            <input
              type="range"
              min="0"
              max="90"
              value={azimuthDeg}
              onChange={(e) => setAzimuthDeg(parseInt(e.target.value))}
              className="w-20 accent-blue-600 cursor-pointer"
              title="Rotate viewing angle"
            />
            <span className="font-mono text-[11px] w-6">{azimuthDeg}°</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Elevation:</span>
            <input
              type="range"
              min="5"
              max="60"
              value={elevationDeg}
              onChange={(e) => setElevationDeg(parseInt(e.target.value))}
              className="w-16 accent-blue-600 cursor-pointer"
              title="Pitch up/down"
            />
            <span className="font-mono text-[11px] w-6">{elevationDeg}°</span>
          </div>

          {/* Quick Channel Inspection Dropdown */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-slate-700">
            <span className="text-[11px] text-slate-500">Inspect TC:</span>
            <select
              value={selectedChannelId || ''}
              onChange={(e) => onSelectChannel(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-blue-600 font-bold focus:outline-none"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  TC {ch.channelNumber}: {ch.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
