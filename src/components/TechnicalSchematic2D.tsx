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
  RotateCcw,
  Compass,
  Sliders,
  Ruler,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Sparkles,
  Lock,
  Unlock,
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
  const [showPermanentSensors, setShowPermanentSensors] = useState(true);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const [rotationLocked, setRotationLocked] = useState(false);
  
  // Default positions for callouts
  const [calloutPos, setCalloutPos] = useState<Record<string, {x: number, y: number}>>({
    top: {x: 400, y: 50},
    bottom: {x: 400, y: 600},
    left: {x: 50, y: 300},
    right: {x: 800, y: 300},
    back: {x: 800, y: 100},
    control: {x: 50, y: 100},
    overtemp: {x: 50, y: 150},
  });

  const handleMouseDown = (e: React.MouseEvent, calloutId?: string) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (calloutId) setActiveCallout(calloutId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // If dragging a callout, move it
    if (activeCallout) {
      setCalloutPos((prev) => ({
        ...prev,
        [activeCallout]: {
          x: prev[activeCallout].x + dx,
          y: prev[activeCallout].y + dy,
        },
      }));
    } else if (!rotationLocked) {
      // If rotation is not locked, rotate view
      setAzimuthDeg((prev) => (prev + dx * 0.75 + 360) % 360);
      setElevationDeg((prev) => Math.max(-20, Math.min(85, prev - dy * 0.5)));
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveCallout(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => Math.max(0.4, Math.min(3.5, prev + delta)));
  };

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

  const controlProj = useMemo(() => {
    if (!chamber.controlSensorPos) return null;
    const p = project3Dto2D(chamber.controlSensorPos.x, chamber.controlSensorPos.y, chamber.controlSensorPos.z);
    return { ...chamber.controlSensorPos, ...p };
  }, [chamber.controlSensorPos, project3Dto2D]);

  const overtempProj = useMemo(() => {
    if (!chamber.overtempSensorPos) return null;
    const p = project3Dto2D(chamber.overtempSensorPos.x, chamber.overtempSensorPos.y, chamber.overtempSensorPos.z);
    return { ...chamber.overtempSensorPos, ...p };
  }, [chamber.overtempSensorPos, project3Dto2D]);

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

  const renderCallout = (id: string, label: string, anchor3D: {x: number, y: number, z: number}) => {
    const p = project3Dto2D(anchor3D.x, anchor3D.y, anchor3D.z);
    const pos = calloutPos[id];
    
    return (
      <g 
        key={id}
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, id); }}
        className="cursor-grab active:cursor-grabbing"
      >
        <line x1={p.x} y1={p.y} x2={pos.x} y2={pos.y} stroke="#64748B" strokeDasharray="4,4" strokeWidth="1" />
        <rect x={pos.x - 50} y={pos.y - 12} width="100" height="24" rx="4" fill={isWhiteTheme ? '#F8FAFC' : '#1E293B'} stroke="#64748B" strokeWidth="1" />
        <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10" fill={isWhiteTheme ? '#0F172A' : '#F1F5F9'} fontWeight="bold">
          {label}
        </text>
      </g>
    );
  };

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
      onMouseDown={(e) => handleMouseDown(e)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {/* Empty container to maintain layout */}
        <div />

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

          {/* Zoom controls */}
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className={`p-1.5 rounded-lg cursor-pointer ${isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
              className={`p-1.5 rounded-lg cursor-pointer ${isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => setRotationLocked(!rotationLocked)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors flex items-center gap-1.5 ${
              rotationLocked
                ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Lock rotation to allow dragging of labels"
          >
            {rotationLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{rotationLocked ? 'Rotation Locked' : 'Rotation Unlocked'}</span>
          </button>


          {/* 360° Rotation controls */}
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => setAzimuthDeg((a) => (a - 45 + 360) % 360)}
              className={`p-1.5 rounded-lg cursor-pointer ${isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Rotate 45° Left"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={Math.round(azimuthDeg)}
              onChange={(e) => setAzimuthDeg(parseFloat(e.target.value) || 0)}
              className="w-20 accent-blue-600 cursor-pointer"
              title="360° Azimuth Rotation"
            />
            <button
              onClick={() => setAzimuthDeg((a) => (a + 45) % 360)}
              className={`p-1.5 rounded-lg cursor-pointer ${isWhiteTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Rotate 45° Right"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => setShowPermanentSensors(!showPermanentSensors)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors flex items-center gap-1.5 ${
              showPermanentSensors
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle display of permanent Control & Overtemp sensors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Permanent TCs</span>
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
      <div
        className="w-full flex-1 relative overflow-auto flex items-center justify-center p-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
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

          {/* Front of Furnace Indicator Callout */}
          <g>
            <line
              x1={(chamberVertices.fBL.x + chamberVertices.fBR.x) / 2}
              y1={(chamberVertices.fBL.y + chamberVertices.fBR.y) / 2 + 5}
              x2={(chamberVertices.fBL.x + chamberVertices.fBR.x) / 2}
              y2={(chamberVertices.fBL.y + chamberVertices.fBR.y) / 2 + 40}
              stroke="#2563EB"
              strokeWidth="2"
              strokeDasharray="3,3"
              markerEnd="url(#arrow-blue-end)"
            />
            <rect
              x={(chamberVertices.fBL.x + chamberVertices.fBR.x) / 2 - 85}
              y={(chamberVertices.fBL.y + chamberVertices.fBR.y) / 2 + 40}
              width="170"
              height="24"
              rx="5"
              fill={isWhiteTheme ? '#1E293B' : '#0F172A'}
              stroke="#3B82F6"
              strokeWidth="1.5"
              filter="url(#badge-shadow)"
            />
            <text
              x={(chamberVertices.fBL.x + chamberVertices.fBR.x) / 2}
              y={(chamberVertices.fBL.y + chamberVertices.fBR.y) / 2 + 56}
              textAnchor="middle"
              fill="#60A5FA"
              fontSize="10"
              fontWeight="bold"
            >
              ▲ FRONT OF FURNACE (DOOR)
            </text>
          </g>

          {/* Permanent Furnace Sensors Node Dots on 3D Model */}
          {showPermanentSensors && (
            <g>
              {controlProj && (
                <g>
                  {/* Control TC Node Dot */}
                  <circle cx={controlProj.x} cy={controlProj.y} r="7" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2" filter="url(#badge-shadow)" />
                  <circle cx={controlProj.x} cy={controlProj.y} r="13" fill="none" stroke="#06B6D4" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.9" />
                </g>
              )}

              {overtempProj && (
                <g>
                  {/* Overtemp TC Node Dot */}
                  <circle cx={overtempProj.x} cy={overtempProj.y} r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" filter="url(#badge-shadow)" />
                  <circle cx={overtempProj.x} cy={overtempProj.y} r="13" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.9" />
                </g>
              )}
            </g>
          )}


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

          {/* Feedthrough Gland or Under-Door Threshold Seal Symbol */}
          {(() => {
            const isUnderDoor = chamber.feedthroughWall === 'under_door';
            const ft = isUnderDoor
              ? { x: 0, y: 15, z: chamber.width / 2 }
              : chamber.feedthroughPos || { x: chamber.length, y: chamber.height * 0.75, z: chamber.width / 2 };
            const ft2D = project3Dto2D(ft.x, ft.y, ft.z);

            return (
              <g transform={`translate(${ft2D.x}, ${ft2D.y})`}>
                {isUnderDoor ? (
                  <>
                    <rect
                      x="-18"
                      y="-5"
                      width="36"
                      height="10"
                      rx="3"
                      fill="#D97706"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="18"
                      textAnchor="middle"
                      fill="#D97706"
                      fontSize="9.5"
                      fontWeight="bold"
                    >
                      UNDER-DOOR FEEDTHROUGH SEAL
                    </text>
                  </>
                ) : (
                  <>
                    <circle cx="0" cy="0" r="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.8" />
                    <text x="12" y="4" fill="#D97706" fontSize="9.5" fontWeight="bold">
                      TUS CABLE GLAND
                    </text>
                  </>
                )}
              </g>
            );
          })()}



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
          </g>
          <g transform="translate(650, 20)">
            <rect width="180" height="145" rx="5" fill={isWhiteTheme ? '#F8FAFC' : '#0F172A'} stroke="#64748B" strokeWidth="1" opacity="0.9" />
            <text x="90" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Offset Dimensions</text>
            <line x1="10" y1="30" x2="170" y2="30" stroke="#64748B" strokeWidth="1" />
            
            <text x="10" y="50" fontSize="10" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Top:</text>
            <text x="170" y="50" textAnchor="end" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>{qwz.offsetCeiling} {dimUnit}</text>
            
            <text x="10" y="70" fontSize="10" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Bottom:</text>
            <text x="170" y="70" textAnchor="end" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>{qwz.offsetFloor} {dimUnit}</text>
            
            <text x="10" y="90" fontSize="10" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Left:</text>
            <text x="170" y="90" textAnchor="end" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>{qwz.offsetLeft} {dimUnit}</text>
            
            <text x="10" y="110" fontSize="10" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Right:</text>
            <text x="170" y="110" textAnchor="end" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>{qwz.offsetRight} {dimUnit}</text>
            
            <text x="10" y="130" fontSize="10" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Back:</text>
            <text x="170" y="130" textAnchor="end" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>{qwz.offsetRear} {dimUnit}</text>
          </g>

          {/* Permanent Sensors Legend Table */}
          {showPermanentSensors && (controlProj || overtempProj) && (
            <g transform="translate(650, 180)">
              <rect width="180" height={controlProj && overtempProj ? 80 : 55} rx="5" fill={isWhiteTheme ? '#F8FAFC' : '#0F172A'} stroke="#64748B" strokeWidth="1" opacity="0.95" filter="url(#badge-shadow)" />
              <text x="90" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill={isWhiteTheme ? '#0F172A' : '#F8FAFC'}>Permanent Sensors Legend</text>
              <line x1="10" y1="26" x2="170" y2="26" stroke="#64748B" strokeWidth="1" />
              
              {controlProj && (
                <g transform="translate(12, 44)">
                  <circle cx="6" cy="-3" r="5" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="18" y="1" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#082F49' : '#22D3EE'}>
                    {controlProj.label || 'Control TC'}
                  </text>
                </g>
              )}

              {overtempProj && (
                <g transform={`translate(12, ${controlProj ? 64 : 44})`}>
                  <circle cx="6" cy="-3" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="18" y="1" fontSize="10" fontWeight="bold" fill={isWhiteTheme ? '#450A0A' : '#F87171'}>
                    {overtempProj.label || 'Overtemp TC'}
                  </text>
                </g>
              )}
            </g>
          )}
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
