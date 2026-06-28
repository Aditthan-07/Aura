import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./orbShaders";

const VALENCE_STOPS = [
  { at: -1, color: new THREE.Color("#6366F1") },
  { at: 0, color: new THREE.Color("#5EEAD4") },
  { at: 1, color: new THREE.Color("#F59E0B") },
];

function valenceToColor(valence) {
  const v = THREE.MathUtils.clamp(valence, -1, 1);
  const [a, b] = v <= 0 ? [VALENCE_STOPS[0], VALENCE_STOPS[1]] : [VALENCE_STOPS[1], VALENCE_STOPS[2]];
  const t = v <= 0 ? v + 1 : v;
  return a.color.clone().lerp(b.color, t);
}

const DEFAULT_EMOTION = { label: "calm", valence: 0, arousal: 0.18 };

function OrbMesh({ emotion, isThinking }) {
  const materialRef = useRef();
  const meshRef = useRef();
  const target = emotion ?? DEFAULT_EMOTION;

  const targetColor = useMemo(() => valenceToColor(target.valence), [target.valence]);

  const animState = useRef({
    color: valenceToColor(DEFAULT_EMOTION.valence),
    arousal: DEFAULT_EMOTION.arousal,
  });

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_color: { value: new THREE.Color("#5EEAD4") },
      u_arousal: { value: DEFAULT_EMOTION.arousal },
    }),
    []
  );

  useFrame((state, delta) => {
    const lerpSpeed = 1 - Math.pow(0.001, delta);
    const anim = animState.current;

    anim.color.lerp(targetColor, lerpSpeed);
    const arousalTarget = isThinking ? Math.max(target.arousal, 0.45) : target.arousal;
    anim.arousal = THREE.MathUtils.lerp(anim.arousal, arousalTarget, lerpSpeed);

    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.u_color.value.copy(anim.color);
      materialRef.current.uniforms.u_arousal.value = anim.arousal;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (0.05 + anim.arousal * 0.08);
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.4, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function AuraOrb({ emotion, isThinking }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <OrbMesh emotion={emotion} isThinking={isThinking} />
    </Canvas>
  );
}
