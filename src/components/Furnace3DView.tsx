import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  DimUnit,
} from '../types/tus';
import {
  Camera,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  Compass,
  Zap,
  Cable,
  Box,
  Ruler,
} from 'lucide-react';

interface Furnace3DViewProps {
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  channels: ThermocoupleChannel[];
  dimUnit: DimUnit;
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onExportImageReady?: (dataUrl: string) => void;
}

export const Furnace3DView: React.FC<Furnace3DViewProps> = ({
  chamber,
  qwz,
  channels,
  dimUnit,
  selectedChannelId,
  onSelectChannel,
  onExportImageReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // View settings toggles
  const [showWires, setShowWires] = useState(true);
  const [showQWZ, setShowQWZ] = useState(true);
  const [showElements, setShowElements] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [ghostWalls, setGhostWalls] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);

  // Keep references to current state to use inside Three.js update loop
  const propsRef = useRef({
    chamber,
    qwz,
    channels,
    dimUnit,
    selectedChannelId,
    showWires,
    showQWZ,
    showElements,
    showDimensions,
    ghostWalls,
  });

  useEffect(() => {
    propsRef.current = {
      chamber,
      qwz,
      channels,
      dimUnit,
      selectedChannelId,
      showWires,
      showQWZ,
      showElements,
      showDimensions,
      ghostWalls,
    };
  }, [chamber, qwz, channels, dimUnit, selectedChannelId, showWires, showQWZ, showElements, showDimensions, ghostWalls]);

  // Capture canvas high-res image
  const captureSnapshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return '';
    
    // Render high quality frame
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    
    if (onExportImageReady) {
      onExportImageReady(dataUrl);
    }
    setCaptureStatus('Captured for Word Report!');
    setTimeout(() => setCaptureStatus(null), 2500);
    return dataUrl;
  }, [onExportImageReady]);

  // Initial Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16); // Deep slate industrial dark
    scene.fog = new THREE.FogExp2(0x090d16, 0.0035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 3000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Studio Environment & Lighting
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    keyLight.position.set(300, 450, 350);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    rimLight.position.set(-300, -200, -350);
    scene.add(rimLight);

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 2000;
    controls.minDistance = 10;
    controls.target.set(0, 0, 0);

    // Dynamic Furnace Content Group
    const dynamicGroup = new THREE.Group();
    dynamicGroupRef.current = dynamicGroup;
    scene.add(dynamicGroup);

    // Ground Grid & Contact Shadow Plate
    const grid = new THREE.GridHelper(600, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -1;
    scene.add(grid);

    // Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      controls.update();

      // Subtle pulse or highlight rotation for selected sensor if any
      const selGroup = dynamicGroup.getObjectByName('selected-sensor-glow');
      if (selGroup) {
        selGroup.rotation.y += delta * 1.5;
      }

      renderer.render(scene, camera);
    };
    animFrameIdRef.current = requestAnimationFrame(animate);

    // Window Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Pre-warm capture after initial load
    setTimeout(() => {
      if (onExportImageReady && rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const initialSnapshot = rendererRef.current.domElement.toDataURL('image/png');
        onExportImageReady(initialSnapshot);
      }
    }, 1200);

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Set Camera Preset Position based on Furnace Size
  const applyCameraPreset = useCallback(
    (preset: 'iso' | 'top' | 'front' | 'side') => {
      if (!cameraRef.current || !controlsRef.current) return;
      const cam = cameraRef.current;
      const ctrls = controlsRef.current;
      setCameraPreset(preset);

      const maxDim = Math.max(chamber.length, chamber.width, chamber.height, 40);
      const dist = maxDim * 2.3;

      ctrls.target.set(0, 0, 0);

      if (preset === 'iso') {
        // True isometric angle: 35.264° elevation, 45° azimuth
        cam.position.set(dist * 0.9, dist * 0.85, dist * 1.1);
      } else if (preset === 'top') {
        cam.position.set(0, dist * 1.4, 0.001);
      } else if (preset === 'front') {
        cam.position.set(-dist * 1.3, 0, 0);
      } else if (preset === 'side') {
        cam.position.set(0, 0, dist * 1.3);
      }

      cam.lookAt(0, 0, 0);
      ctrls.update();
    },
    [chamber]
  );

  // Update Camera when preset changes
  useEffect(() => {
    applyCameraPreset(cameraPreset);
  }, [cameraPreset, chamber.length, chamber.width, chamber.height]);

  // Helper to create high-res text sprite label
  const createTextSprite = (text: string, bgColor: string, textColor: string = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(8, 8, 240, 64, 16);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = 'bold 30px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 40);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(16, 5, 1);
    return sprite;
  };

  // Rebuild 3D Scene Geometry whenever Chamber, QWZ, Channels, or Toggles change
  useEffect(() => {
    const group = dynamicGroupRef.current;
    if (!group) return;

    // Clear previous children and dispose meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    }

    const { length: cL, width: cW, height: cH } = chamber;

    // Center of chamber coordinate transformation:
    // In local coords:
    // x in [0, cL] (front to rear) -> mapped to localX = x - cL/2
    // y in [0, cH] (floor to ceiling) -> mapped to localY = y - cH/2
    // z in [0, cW] (left to right) -> mapped to localZ = z - cW/2
    const toLocal = (x: number, y: number, z: number) => {
      return new THREE.Vector3(x - cL / 2, y - cH / 2, z - cW / 2);
    };

    // ----------------------------------------------------
    // 1. OUTER FURNACE STRUCTURE & INSULATION CHAMBER
    // ----------------------------------------------------
    const chamberGroup = new THREE.Group();
    chamberGroup.name = 'chamber-group';

    // A. Transparent / Ghosted Wall Box
    const wallThickness = Math.max(2, Math.min(cL, cW, cH) * 0.06);
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: ghostWalls ? 0x334155 : 0x1e293b,
      transparent: true,
      opacity: ghostWalls ? 0.22 : 0.65,
      roughness: 0.4,
      metalness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: !ghostWalls,
    });

    const chamberMesh = new THREE.Mesh(new THREE.BoxGeometry(cL, cH, cW), wallMat);
    chamberGroup.add(chamberMesh);

    // B. Outer Structural Steel Cage / Frame Beams
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(cL, cH, cW));
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8, // Cyan steel frame
      linewidth: 2,
    });
    const chamberWireframe = new THREE.LineSegments(edgeGeo, edgeMat);
    chamberGroup.add(chamberWireframe);

    // C. Heavy Industrial Steel Corner Column Posts (Procedural Group)
    const postThick = wallThickness * 0.9;
    const postGeo = new THREE.BoxGeometry(postThick, cH * 1.05, postThick);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.3,
    });

    const cornerOffsets = [
      [-cL / 2, 0, -cW / 2],
      [-cL / 2, 0, cW / 2],
      [cL / 2, 0, -cW / 2],
      [cL / 2, 0, cW / 2],
    ];

    cornerOffsets.forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, py, pz);
      chamberGroup.add(post);
    });

    // D. Refractory Hearth Floor
    const floorGeo = new THREE.BoxGeometry(cL, wallThickness, cW);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -cH / 2 - wallThickness / 2;
    chamberGroup.add(floorMesh);

    // E. Furnace Door & Hinge indicator (Front Face at -cL/2)
    const doorFrameGeo = new THREE.BoxGeometry(1.5, cH * 0.95, cW * 0.95);
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.6,
      roughness: 0.35,
      wireframe: true,
    });
    const doorMesh = new THREE.Mesh(doorFrameGeo, doorFrameMat);
    doorMesh.position.set(-cL / 2, 0, 0);
    chamberGroup.add(doorMesh);

    // ----------------------------------------------------
    // 2. FEEDTHROUGH CABLE PENETRATION GLAND
    // ----------------------------------------------------
    const ftPos = chamber.feedthroughPos || { x: cL, y: cH * 0.75, z: cW * 0.5 };
    const feedthroughLocal = toLocal(ftPos.x, ftPos.y, ftPos.z);

    const glandGeo = new THREE.CylinderGeometry(3.5, 4, 6, 16);
    const glandMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber brass gland
      metalness: 0.9,
      roughness: 0.2,
    });
    const gland = new THREE.Mesh(glandGeo, glandMat);
    gland.position.copy(feedthroughLocal);
    gland.rotation.z = Math.PI / 2;
    chamberGroup.add(gland);

    // Feedthrough Label Sprite
    const glandLabel = createTextSprite('TUS CABLE GLAND', '#d97706');
    glandLabel.position.copy(feedthroughLocal).add(new THREE.Vector3(0, 6, 0));
    chamberGroup.add(glandLabel);

    // ----------------------------------------------------
    // 3. HEATING ELEMENTS (Coils along Left/Right walls)
    // ----------------------------------------------------
    if (showElements) {
      const elementMat = new THREE.MeshStandardMaterial({
        color: 0xf97316, // Orange heating element
        emissive: 0xea580c,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.5,
      });

      [-cW / 2 + 1.5, cW / 2 - 1.5].forEach((wallZ) => {
        const rows = 4;
        for (let r = 0; r < rows; r++) {
          const eleY = -cH / 2 + ((r + 1) * cH) / (rows + 1);
          const coilGeo = new THREE.CylinderGeometry(0.8, 0.8, cL * 0.8, 12);
          const coil = new THREE.Mesh(coilGeo, elementMat);
          coil.rotation.z = Math.PI / 2;
          coil.position.set(0, eleY, wallZ);
          chamberGroup.add(coil);
        }
      });
    }

    group.add(chamberGroup);

    // ----------------------------------------------------
    // 4. QUALIFIED WORK ZONE (QWZ) CAGE
    // ----------------------------------------------------
    if (showQWZ) {
      const qGroup = new THREE.Group();
      qGroup.name = 'qwz-group';

      const qCenterLocal = toLocal(
        qwz.offsetFront + qwz.length / 2,
        qwz.offsetFloor + qwz.height / 2,
        qwz.offsetLeft + qwz.width / 2
      );

      // Translucent QWZ Envelope Box
      const qBoxMat = new THREE.MeshPhysicalMaterial({
        color: 0x10b981, // Emerald green QWZ
        transparent: true,
        opacity: 0.16,
        roughness: 0.2,
        transmission: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const qBox = new THREE.Mesh(new THREE.BoxGeometry(qwz.length, qwz.height, qwz.width), qBoxMat);
      qBox.position.copy(qCenterLocal);
      qGroup.add(qBox);

      // Distinct Emerald Boundary Frame
      const qEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(qwz.length, qwz.height, qwz.width));
      const qLineMat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        linewidth: 3,
      });
      const qWire = new THREE.LineSegments(qEdges, qLineMat);
      qWire.position.copy(qCenterLocal);
      qGroup.add(qWire);

      // QWZ Tag Sprite
      const qTag = createTextSprite('QUALIFIED WORK ZONE', '#059669');
      qTag.position.set(qCenterLocal.x, qCenterLocal.y + qwz.height / 2 + 5, qCenterLocal.z);
      qGroup.add(qTag);

      group.add(qGroup);
    }

    // ----------------------------------------------------
    // 5. THERMOCOUPLE SENSORS & LEAD WIRE HARNESS ROUTING
    // ----------------------------------------------------
    const sensorGroup = new THREE.Group();
    sensorGroup.name = 'sensors-group';

    // Probe Geometries
    const probeTipGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const probeSheathGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.5, 12);

    channels.forEach((ch) => {
      const isSelected = ch.id === selectedChannelId;
      const sensorPos = toLocal(ch.x, ch.y, ch.z);

      const chSubGroup = new THREE.Group();
      chSubGroup.position.copy(sensorPos);

      // Metallic Sheath
      const sheathMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.85,
        roughness: 0.2,
      });
      const sheath = new THREE.Mesh(probeSheathGeo, sheathMat);
      sheath.position.y = 2.25;
      chSubGroup.add(sheath);

      // Sensor Active Tip Bulb
      const tipColor = isSelected ? 0xef4444 : ch.isControlSensor ? 0x3b82f6 : 0xf59e0b;
      const tipMat = new THREE.MeshStandardMaterial({
        color: tipColor,
        emissive: tipColor,
        emissiveIntensity: isSelected ? 0.9 : 0.4,
        roughness: 0.2,
        metalness: 0.4,
      });
      const tip = new THREE.Mesh(probeTipGeo, tipMat);
      chSubGroup.add(tip);

      // Glow halo for selected sensor
      if (isSelected) {
        const glowGeo = new THREE.RingGeometry(2.5, 3.8, 24);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.name = 'selected-sensor-glow';
        glow.rotation.x = Math.PI / 2;
        chSubGroup.add(glow);
      }

      // 3D Tag Label
      const tagBg = isSelected ? '#dc2626' : ch.isControlSensor ? '#2563eb' : '#0284c7';
      const labelSprite = createTextSprite(`TC ${ch.channelNumber}`, tagBg);
      labelSprite.position.set(0, 6.5, 0);
      chSubGroup.add(labelSprite);

      sensorGroup.add(chSubGroup);

      // ----------------------------------------------------
      // LEAD WIRE HARNESS (Curved 3D spline to feedthrough)
      // ----------------------------------------------------
      if (showWires) {
        // Build realistic cable path from sensor tip -> harness trunk -> feedthrough
        // Route along chamber ceiling/wall rather than a straight diagonal collision
        const trunkY = Math.max(sensorPos.y + 4, cH * 0.42);
        const midPoint = new THREE.Vector3(
          sensorPos.x + (feedthroughLocal.x - sensorPos.x) * 0.5,
          trunkY,
          sensorPos.z + (feedthroughLocal.z - sensorPos.z) * 0.5
        );

        const curve = new THREE.CatmullRomCurve3([
          sensorPos.clone().add(new THREE.Vector3(0, 4.5, 0)),
          new THREE.Vector3(sensorPos.x, trunkY, sensorPos.z),
          midPoint,
          feedthroughLocal.clone().add(new THREE.Vector3(-1.5, 0, 0)),
          feedthroughLocal.clone(),
        ]);

        const wireTubeGeo = new THREE.TubeGeometry(curve, 32, 0.35, 8, false);
        const wireMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xfca5a5 : 0xa5f3fc,
          metalness: 0.4,
          roughness: 0.6,
          emissive: isSelected ? 0x991b1b : 0x0891b2,
          emissiveIntensity: isSelected ? 0.4 : 0.15,
        });
        const wireMesh = new THREE.Mesh(wireTubeGeo, wireMat);
        sensorGroup.add(wireMesh);
      }

      // ----------------------------------------------------
      // DIMENSION RULER LINES (for selected channel)
      // ----------------------------------------------------
      if (showDimensions && isSelected) {
        const dimGroup = new THREE.Group();
        const dimLineMat = new THREE.LineDashedMaterial({
          color: 0xfacc15, // Yellow dimension leader lines
          dashSize: 2,
          gapSize: 1,
          linewidth: 2,
        });

        // Line to Left Wall (z = -cW/2)
        const leftWallPt = new THREE.Vector3(sensorPos.x, sensorPos.y, -cW / 2);
        const geoL = new THREE.BufferGeometry().setFromPoints([sensorPos, leftWallPt]);
        const lineL = new THREE.Line(geoL, dimLineMat);
        lineL.computeLineDistances();
        dimGroup.add(lineL);

        // Line to Floor (y = -cH/2)
        const floorPt = new THREE.Vector3(sensorPos.x, -cH / 2, sensorPos.z);
        const geoFl = new THREE.BufferGeometry().setFromPoints([sensorPos, floorPt]);
        const lineFl = new THREE.Line(geoFl, dimLineMat);
        lineFl.computeLineDistances();
        dimGroup.add(lineFl);

        // Line to Front Wall (x = -cL/2)
        const frontPt = new THREE.Vector3(-cL / 2, sensorPos.y, sensorPos.z);
        const geoFr = new THREE.BufferGeometry().setFromPoints([sensorPos, frontPt]);
        const lineFr = new THREE.Line(geoFr, dimLineMat);
        lineFr.computeLineDistances();
        dimGroup.add(lineFr);

        // Clearance Text Badges
        const badgeL = createTextSprite(`Left: ${ch.distLeft}${dimUnit}`, '#854d0e');
        badgeL.position.copy(sensorPos).lerp(leftWallPt, 0.5).add(new THREE.Vector3(0, 2, 0));
        dimGroup.add(badgeL);

        const badgeFl = createTextSprite(`Floor: ${ch.distFloor}${dimUnit}`, '#854d0e');
        badgeFl.position.copy(sensorPos).lerp(floorPt, 0.5).add(new THREE.Vector3(2, 0, 0));
        dimGroup.add(badgeFl);

        sensorGroup.add(dimGroup);
      }
    });

    group.add(sensorGroup);

    // Notify capture ready after geometry render
    if (rendererRef.current && sceneRef.current && cameraRef.current && onExportImageReady) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const snapshot = rendererRef.current.domElement.toDataURL('image/png');
      onExportImageReady(snapshot);
    }
  }, [
    chamber,
    qwz,
    channels,
    dimUnit,
    selectedChannelId,
    showWires,
    showQWZ,
    showElements,
    showDimensions,
    ghostWalls,
    onExportImageReady,
  ]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="w-full flex-1 relative cursor-grab active:cursor-grabbing"
        tabIndex={0}
      />

      {/* Top Floating Info & Camera Angle Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Furnace Spec Badge */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs flex items-center gap-3 text-slate-200 shadow-lg">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
            <Box className="w-4 h-4" />
            <span>FURNACE 3D MODEL</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-slate-300">
            {chamber.length} × {chamber.width} × {chamber.height} {dimUnit}
          </span>
          <span className="text-slate-500">|</span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {channels.length} Channels Active
          </span>
        </div>

        {/* Camera Views & Snapshot Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-lg">
          <button
            onClick={() => applyCameraPreset('iso')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              cameraPreset === 'iso'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Isometric (35.3° Axonometric View)"
          >
            Isometric
          </button>
          <button
            onClick={() => applyCameraPreset('top')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              cameraPreset === 'top'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Top / Plan View"
          >
            Top / Plan
          </button>
          <button
            onClick={() => applyCameraPreset('front')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              cameraPreset === 'front'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Front / Door Elevation"
          >
            Front
          </button>
          <button
            onClick={() => applyCameraPreset('side')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              cameraPreset === 'side'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Side Profile"
          >
            Side
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1" />
          <button
            onClick={captureSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
            title="Export high-resolution isometric view image for Nadcap report"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture CAD</span>
          </button>
        </div>
      </div>

      {/* Capture Feedback Notification */}
      {captureStatus && (
        <div className="absolute top-16 right-4 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-xl animate-fade-in flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{captureStatus}</span>
        </div>
      )}

      {/* Selected Sensor Floating HUD */}
      {selectedChannelId && (
        <div className="absolute bottom-16 left-4 bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-xl p-3 text-xs max-w-xs shadow-2xl pointer-events-auto">
          {(() => {
            const ch = channels.find((c) => c.id === selectedChannelId);
            if (!ch) return null;
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 font-mono text-sm">
                    TC {ch.channelNumber}: {ch.label}
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                    Type {ch.type}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500">Left Wall:</span> {ch.distLeft} {dimUnit}
                  </div>
                  <div>
                    <span className="text-slate-500">Right Wall:</span> {ch.distRight} {dimUnit}
                  </div>
                  <div>
                    <span className="text-slate-500">Front Door:</span> {ch.distFront} {dimUnit}
                  </div>
                  <div>
                    <span className="text-slate-500">Rear Wall:</span> {ch.distRear} {dimUnit}
                  </div>
                  <div>
                    <span className="text-slate-500">Hearth/Flr:</span> {ch.distFloor} {dimUnit}
                  </div>
                  <div>
                    <span className="text-slate-500">Roof/Ceil:</span> {ch.distCeiling} {dimUnit}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Bottom Collapsible Display Filter Dock */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            3D Display Layers:
          </span>

          <button
            onClick={() => setShowWires(!showWires)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              showWires
                ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>TC Wires</span>
          </button>

          <button
            onClick={() => setShowQWZ(!showQWZ)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              showQWZ
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>QWZ Cage</span>
          </button>

          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              showDimensions
                ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Offsets & Rulers</span>
          </button>

          <button
            onClick={() => setGhostWalls(!ghostWalls)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              ghostWalls
                ? 'bg-purple-950/60 border-purple-700/60 text-purple-300'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ghost Chamber</span>
          </button>
        </div>

        {/* Quick Channel Selector Pill */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Inspect Channel:</span>
          <select
            value={selectedChannelId || ''}
            onChange={(e) => onSelectChannel(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Channels</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                TC {ch.channelNumber}: {ch.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
