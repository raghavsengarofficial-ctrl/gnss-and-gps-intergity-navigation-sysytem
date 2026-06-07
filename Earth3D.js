import React, { useMemo, useRef, useState, Suspense } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Globe } from "lucide-react";

const EARTH_TEXTURE_URL = "https://unpkg.com/three-globe@2.31.3/example/img/earth-blue-marble.jpg";
const EARTH_BUMP_URL = "https://unpkg.com/three-globe@2.31.3/example/img/earth-topology.png";

function latLonToVector(lat, lon, radius = 1.82) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function EarthSphere({ latest, status }) {
  const earthRef = useRef();
  const cloudRef = useRef();
  const markerRef = useRef();
  const ringRef = useRef();

  const [texture, bumpMap] = useLoader(THREE.TextureLoader, [EARTH_TEXTURE_URL, EARTH_BUMP_URL]);

  const marker = useMemo(
    () => latLonToVector(latest.lat || 12.9716, latest.lon || 77.5946, 1.85),
    [latest.lat, latest.lon]
  );

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.055;
    if (markerRef.current) markerRef.current.scale.setScalar(1 + Math.sin(Date.now() / 200) * 0.2);
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(Date.now() / 300) * 0.35);
      ringRef.current.material.opacity = 0.3 + Math.sin(Date.now() / 300) * 0.15;
    }
  });

  const markerColor = status === "ANOMALY" ? "#ef4444" : "#22c55e";

  return (
    <group>
      {/* Main Earth with NASA Blue Marble texture */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={bumpMap}
          bumpScale={0.04}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>

      {/* Transparent cloud/atmosphere shell */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[1.83, 48, 48]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.04}
          roughness={1}
        />
      </mesh>

      {/* Inner atmospheric glow (Fresnel-like) */}
      <mesh>
        <sphereGeometry args={[1.86, 64, 64]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* Outer atmospheric halo */}
      <mesh>
        <sphereGeometry args={[1.95, 64, 64]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.035} side={THREE.BackSide} />
      </mesh>

      {/* Receiver marker - core dot */}
      <mesh ref={markerRef} position={marker}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={markerColor} />
      </mesh>

      {/* Receiver marker - pulsing ring */}
      <mesh ref={ringRef} position={marker}>
        <ringGeometry args={[0.06, 0.09, 32]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Receiver marker - glow halo */}
      <mesh position={marker}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function Orbit({ radius, tilt, color }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line rotation={[tilt, 0, tilt / 2]}>
      <primitive attach="geometry" object={geometry} />
      <lineBasicMaterial attach="material" color={color} transparent opacity={0.2} linewidth={1} />
    </line>
  );
}

function Satellites({ satellites }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.1;
  });

  return (
    <group ref={group}>
      {[2.55, 2.85, 3.15].map((radius, i) => (
        <Orbit
          key={radius}
          radius={radius}
          tilt={(i + 1) * 0.48}
          color={i === 0 ? "#22c55e" : i === 1 ? "#06b6d4" : "#f59e0b"}
        />
      ))}
      {satellites.slice(0, 24).map((sat, i) => {
        const radius = 2.55 + (i % 3) * 0.3;
        const angle = ((sat.azimuth + i * 11) * Math.PI) / 180;
        const y = Math.sin(((sat.elevation || 30) * Math.PI) / 180) * 0.8;
        const satColor = sat.used ? "#22c55e" : "#06b6d4";
        return (
          <group key={`${sat.constellation}-${sat.prn}`} position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
            {/* Solar panel wings */}
            <mesh>
              <boxGeometry args={[0.18, 0.01, 0.06]} />
              <meshBasicMaterial color={satColor} transparent opacity={0.8} />
            </mesh>
            {/* Satellite body */}
            <mesh>
              <boxGeometry args={[0.06, 0.04, 0.06]} />
              <meshBasicMaterial color={satColor} />
            </mesh>
            {/* Satellite glow */}
            <pointLight color={satColor} intensity={0.3} distance={0.4} />
          </group>
        );
      })}
    </group>
  );
}

function Stars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const sizes = new Float32Array(2000);
    for (let i = 0; i < 2000; i++) {
      let x, y, z;
      do {
        x = THREE.MathUtils.randFloatSpread(30);
        y = THREE.MathUtils.randFloatSpread(30);
        z = THREE.MathUtils.randFloatSpread(30);
      } while (Math.sqrt(x * x + y * y + z * z) < 5);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = Math.random() * 0.04 + 0.01;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points>
      <primitive attach="geometry" object={geometry} />
      <pointsMaterial attach="material" color="#c8d6e5" size={0.035} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

// Fallback Earth for when textures are loading
function FallbackEarth() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshStandardMaterial color="#081b33" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.81, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} wireframe />
      </mesh>
    </group>
  );
}

// Wrapper with Suspense for texture loading
function EarthScene({ satellites, latest, status }) {
  return (
    <>
      <color attach="background" args={["#030508"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={2.0} color="#fff5e6" />
      <pointLight position={[-5, -3, -5]} intensity={0.4} color="#3b82f6" />
      <Stars />
      <EarthSphere latest={latest} status={status} />
      <Satellites satellites={satellites} />
    </>
  );
}

export default function Earth3D({ satellites, latest, status }) {
  return (
    <div className="panel h-full min-h-[520px] overflow-hidden p-5 shadow-glass-md flex flex-col">
      <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-3 z-10">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-mission-blue" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">
              Orbital View
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Live constellation geometry &amp; receiver
            </p>
          </div>
        </div>
        <span className="rounded bg-slate-800/60 border border-slate-600/50 px-3 py-1 text-xs font-bold tracking-widest text-slate-300 shadow-glass-sm">
          ECEF SYNC
        </span>
      </div>
      <div className="flex-1 relative rounded-lg overflow-hidden bg-gradient-to-b from-slate-900/50 to-transparent">
        <Canvas camera={{ position: [0, 1.2, 6.2], fov: 45 }}>
          <Suspense fallback={<FallbackEarth />}>
            <EarthScene satellites={satellites} latest={latest} status={status} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
