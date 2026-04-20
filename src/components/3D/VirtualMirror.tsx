/**
 * 🧵 VirtualMirror — Mannequin 3D avec visualisation des mesures
 * Utilise React Three Fiber + Drei pour un rendu 3D interactif.
 *
 * Architecture :
 * - Mannequin simplifié construit en primitives Three.js
 * - Lignes + labels de mesures superposées
 * - Contrôles orbitaux pour rotation/zoom
 * - Responsive dans un panneau latéral ou modal
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { useState, useMemo, Suspense } from 'react';
import { Ruler, RotateCcw, ZoomIn, Eye } from 'lucide-react';
import type { MeasurementEntry } from '@/types';

interface VirtualMirrorProps {
  measurements: MeasurementEntry[];
  className?: string;
}

// Mapping: measurement key_name → 3D position [startY, endY, xOffset]
const MEASUREMENT_3D_MAP: Record<string, { y1: number; y2: number; x: number; side: 'left' | 'right' }> = {
  neck:        { y1: 2.6,  y2: 2.4,  x: 0.6,  side: 'right' },
  chest:       { y1: 2.1,  y2: 2.1,  x: -0.9, side: 'left' },
  shoulders:   { y1: 2.35, y2: 2.35, x: 1.0,  side: 'right' },
  arm_length:  { y1: 2.2,  y2: 1.2,  x: -1.2, side: 'left' },
  waist:       { y1: 1.5,  y2: 1.5,  x: 0.9,  side: 'right' },
  full_length: { y1: 2.6,  y2: 0.0,  x: 1.4,  side: 'right' },
  biceps:      { y1: 1.9,  y2: 1.9,  x: -1.1, side: 'left' },
  hips:        { y1: 1.1,  y2: 1.1,  x: -0.9, side: 'left' },
};

export function VirtualMirror({ measurements, className }: VirtualMirrorProps) {
  const [showLabels, setShowLabels] = useState(true);

  const measurementLines = useMemo(() => {
    return measurements
      .filter((m) => MEASUREMENT_3D_MAP[m.key_name])
      .map((m) => ({
        ...m,
        pos: MEASUREMENT_3D_MAP[m.key_name],
      }));
  }, [measurements]);

  return (
    <div className={`bg-[#1C1917] rounded-[2rem] overflow-hidden relative ${className ?? ''}`}>
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            showLabels ? 'bg-[#B68D40] text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
          }`}
        >
          <Ruler className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <Eye className="w-3 h-3 text-[#B68D40]" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
            {measurements.length} mesure{measurements.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <RotateCcw className="w-3 h-3 text-white/40" />
          <span className="text-[8px] text-white/40 font-bold">Glisser pour tourner</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <ZoomIn className="w-3 h-3 text-white/40" />
          <span className="text-[8px] text-white/40 font-bold">Scroll pour zoomer</span>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.5, 4.5], fov: 50 }}
        style={{ height: '100%', minHeight: 500 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={0.8} />
          <directionalLight position={[-3, 4, -3]} intensity={0.3} />

          {/* Floor grid */}
          <gridHelper args={[6, 12, '#333333', '#222222']} position={[0, -0.01, 0]} />

          {/* Mannequin */}
          <Mannequin />

          {/* Measurement lines & labels */}
          {showLabels && measurementLines.map((m) => (
            <MeasurementIndicator key={m.key_name} measurement={m} pos={m.pos} />
          ))}

          <OrbitControls
            enablePan={false}
            minDistance={2.5}
            maxDistance={8}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2}
            target={[0, 1.3, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Mannequin (Primitives géométriques) ───────────────────────────

function Mannequin() {
  const skinColor = '#D4A574';
  const darkColor = '#2A2A2A';

  return (
    <group position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.45, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.28, 0.35, 1.05, 8]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Waist / Hips */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.35, 0.3, 0.4, 8]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Left Shoulder */}
      <mesh position={[-0.45, 2.3, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} />
      </mesh>

      {/* Right Shoulder */}
      <mesh position={[0.45, 2.3, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.55, 1.75, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.06, 0.08, 0.9, 6]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.55, 1.75, 0]} rotation={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.06, 0.08, 0.9, 6]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Left Forearm */}
      <mesh position={[-0.62, 1.15, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.05, 0.06, 0.7, 6]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Right Forearm */}
      <mesh position={[0.62, 1.15, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.05, 0.06, 0.7, 6]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.17, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.9, 6]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.17, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.9, 6]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} />
      </mesh>

      {/* Left Shin */}
      <mesh position={[-0.17, -0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.6, 6]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} />
      </mesh>

      {/* Right Shin */}
      <mesh position={[0.17, -0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.6, 6]} />
        <meshStandardMaterial color={darkColor} roughness={0.4} />
      </mesh>

      {/* Platform */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Measurement Line + Label ──────────────────────────────────────

interface MeasurementIndicatorProps {
  measurement: MeasurementEntry;
  pos: { y1: number; y2: number; x: number; side: 'left' | 'right' };
}

function MeasurementIndicator({ measurement, pos }: MeasurementIndicatorProps) {
  const isVertical = Math.abs(pos.y1 - pos.y2) > 0.1;
  const midY = (pos.y1 + pos.y2) / 2;
  const labelX = pos.side === 'left' ? pos.x - 0.5 : pos.x + 0.5;

  return (
    <group>
      {/* Measurement line */}
      <Line
        points={
          isVertical
            ? [[pos.x, pos.y1, 0.3], [pos.x, pos.y2, 0.3]]
            : [[pos.x - 0.3, pos.y1, 0.3], [pos.x + 0.3, pos.y1, 0.3]]
        }
        color="#B68D40"
        lineWidth={2}
        dashed
        dashScale={8}
      />

      {/* End markers for vertical */}
      {isVertical && (
        <>
          <Line
            points={[[pos.x - 0.08, pos.y1, 0.3], [pos.x + 0.08, pos.y1, 0.3]]}
            color="#B68D40"
            lineWidth={2}
          />
          <Line
            points={[[pos.x - 0.08, pos.y2, 0.3], [pos.x + 0.08, pos.y2, 0.3]]}
            color="#B68D40"
            lineWidth={2}
          />
        </>
      )}

      {/* Label background + text */}
      <group position={[labelX, midY, 0.3]}>
        <mesh>
          <planeGeometry args={[0.7, 0.18]} />
          <meshBasicMaterial color="#1C1917" transparent opacity={0.85} />
        </mesh>
        <Text
          position={[0, 0.001, 0.01]}
          fontSize={0.065}
          color="#B68D40"
          anchorX="center"
          anchorY="middle"
        >
          {`${measurement.value} cm`}
        </Text>
        <Text
          position={[0, -0.1, 0.01]}
          fontSize={0.04}
          color="#888888"
          anchorX="center"
          anchorY="middle"
        >
          {measurement.label}
        </Text>
      </group>
    </group>
  );
}
