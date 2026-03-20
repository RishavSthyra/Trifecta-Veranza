"use client";

import { Suspense, memo, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import type { MasterPlanArrowPoint } from "@/data/masterPlanArrowPoints";

type Props = {
  points: MasterPlanArrowPoint[];
  className?: string;
  modelPath?: string;
};

function ArrowGLB({
  path,
  scale = 1.8,
  hovered = false,
}: {
  path: string;
  rotationDeg?: number;
  scale?: number;
  hovered?: boolean;
}) {
  const { scene } = useGLTF(path);
  const spinnerRef = useRef<THREE.Group>(null);

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame((state) => {
    if (!spinnerRef.current) return;

    const t = state.clock.elapsedTime;

    spinnerRef.current.rotation.y = t * 0.6;

    const targetScale = hovered ? scale * 1.12 : scale * 5;
    spinnerRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.12,
    );
  });

  return (
    <group rotation={[0, 0, 0]}>
      <group ref={spinnerRef}>
        <primitive
          object={clonedScene}
          rotation={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

function ArrowMarker({
  point,
  modelPath,
}: {
  point: MasterPlanArrowPoint;
  modelPath?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="absolute z-[4]"
      style={{
        left: `${point.x}%`,
        top: `${point.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="group relative flex items-center justify-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{
            scale: hovered ? 1.08 : 1,
          }}
          transition={{ duration: 0.25 }}
          className="relative h-20 w-20 md:h-28 md:w-28 lg:h-32 lg:w-32"
        >
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 5], fov: 28 }}
            gl={{ alpha: true, antialias: true }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={1.8} />
              <directionalLight position={[3, 3, 5]} intensity={2.8} />
              <directionalLight position={[-3, -2, 4]} intensity={1.2} />
              <ArrowGLB
                path={modelPath || "/models/arrow.glb"}
                rotationDeg={point.rotation ?? 0}
                scale={point.scale ?? 2}
                hovered={hovered}
              />
              <Environment preset="city" />
            </Suspense>
          </Canvas>

          <div className="pointer-events-none absolute inset-0 rounded-full bg-white/5 blur-xl" />
        </motion.div>

        <AnimatePresence>
          {hovered && point.label ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md dark:bg-white/15"
            >
              {point.label}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MasterPlanArrowMarkersBase({
  points,
  className,
  modelPath,
}: Props) {
  return (
    <div className={`absolute inset-0 z-[4] ${className || ""}`}>
      {points.map((point) => (
        <ArrowMarker
          key={point.id}
          point={point}
          modelPath={modelPath}
        />
      ))}
    </div>
  );
}

const MasterPlanArrowMarkers = memo(MasterPlanArrowMarkersBase);

export default MasterPlanArrowMarkers;

useGLTF.preload("/models/arrow.glb");