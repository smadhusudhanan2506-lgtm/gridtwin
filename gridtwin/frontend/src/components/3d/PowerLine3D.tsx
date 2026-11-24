import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface PowerLine3DProps {
  start: [number, number, number];
  end: [number, number, number];
  isEnergized: boolean;
  sag?: number;
  voltageKv?: number;
  reverseFlow?: boolean;
  color?: string;
  pulseColor?: string;
  pulseColor2?: string;
}

export const PowerLine3D: React.FC<PowerLine3DProps> = ({
  start,
  end,
  isEnergized,
  sag = 0.5,
  reverseFlow = false,
  color,
  pulseColor,
  pulseColor2,
}) => {
  const showPowerFlow = useGridStore((s) => s.showPowerFlow);
  const pulseSphereRef = useRef<THREE.Mesh>(null);
  const pulseSphere2Ref = useRef<THREE.Mesh>(null);
  const pulseSphere3Ref = useRef<THREE.Mesh>(null);

  // Generate catenary sagging cable curve
  const curve = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2 - sag,
      (p1.z + p2.z) / 2
    );
    return new THREE.QuadraticBezierCurve3(p1, mid, p2);
  }, [start, end, sag]);

  // Cable tube geometry
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, reverseFlow ? 0.055 : 0.04, 8, false);
  }, [curve, reverseFlow]);

  // Animate glowing power flow energy pulse along cable
  useFrame(({ clock }) => {
    if (!isEnergized || !showPowerFlow) return;
    const speed = reverseFlow ? 0.55 : 0.45;
    const progress = (clock.getElapsedTime() * speed) % 1;
    const progress2 = (clock.getElapsedTime() * speed + 0.35) % 1;
    const progress3 = (clock.getElapsedTime() * speed + 0.7) % 1;

    // When reverseFlow is true, energy flows backwards from end (building) to start (tower)
    const t = reverseFlow ? (1 - progress) : progress;
    const t2 = reverseFlow ? (1 - progress2) : progress2;
    const t3 = reverseFlow ? (1 - progress3) : progress3;

    if (pulseSphereRef.current) {
      pulseSphereRef.current.position.copy(curve.getPoint(t));
    }
    if (pulseSphere2Ref.current) {
      pulseSphere2Ref.current.position.copy(curve.getPoint(t2));
    }
    if (pulseSphere3Ref.current) {
      pulseSphere3Ref.current.position.copy(curve.getPoint(t3));
    }
  });

  const cableColor = isEnergized
    ? (color || (reverseFlow ? '#ef4444' : '#0284c7'))
    : '#334155';
  const emissiveColor = isEnergized
    ? (color || (reverseFlow ? '#dc2626' : '#0369a1'))
    : '#000000';
  const p1Color = pulseColor || (reverseFlow ? '#ff3b30' : '#38bdf8');
  const p2Color = pulseColor2 || (reverseFlow ? '#f87171' : '#7dd3fc');
  const p3Color = pulseColor || (reverseFlow ? '#ef4444' : '#bae6fd');

  return (
    <group>
      {/* Conductor Cable Tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={cableColor}
          emissive={emissiveColor}
          emissiveIntensity={isEnergized ? (reverseFlow ? 0.95 : 0.6) : 0}
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>

      {/* Dynamic Glowing Energy Flow Particles */}
      {isEnergized && showPowerFlow && (
        <>
          <mesh ref={pulseSphereRef}>
            <sphereGeometry args={[reverseFlow ? 0.16 : 0.12, 12, 12]} />
            <meshBasicMaterial color={p1Color} />
          </mesh>
          <mesh ref={pulseSphere2Ref}>
            <sphereGeometry args={[reverseFlow ? 0.13 : 0.09, 12, 12]} />
            <meshBasicMaterial color={p2Color} />
          </mesh>
          {reverseFlow && (
            <mesh ref={pulseSphere3Ref}>
              <sphereGeometry args={[0.14, 12, 12]} />
              <meshBasicMaterial color={p3Color} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
};
