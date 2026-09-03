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

function OrbMesh({ emotion, isThinking, isStreaming, voiceState }) {
  const materialRef = useRef();
  const meshRef = useRef();
  const target = emotion ?? DEFAULT_EMOTION;

  const targetColor = useMemo(() => {
    if (voiceState === "error") {
      return new THREE.Color("#EF4444"); // Soft crimson error state
    }
    return valenceToColor(target.valence);
  }, [target.valence, voiceState]);

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

    // Dynamic arousal modulation based on voice & generation states
    let arousalTarget = target.arousal;
    if (voiceState === "listening") {
      arousalTarget = 0.55 + Math.sin(state.clock.elapsedTime * 6) * 0.15; // Pulsing when listening
    } else if (voiceState === "speaking") {
      arousalTarget = 0.65 + Math.sin(state.clock.elapsedTime * 8) * 0.2; // Expressive when speaking
    } else if (isStreaming) {
      arousalTarget = Math.max(target.arousal, 0.5);
    } else if (isThinking) {
      arousalTarget = Math.max(target.arousal, 0.45);
    }

    anim.arousal = THREE.MathUtils.lerp(anim.arousal, arousalTarget, lerpSpeed);

    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.u_color.value.copy(anim.color);
      materialRef.current.uniforms.u_arousal.value = anim.arousal;
    }

    if (meshRef.current) {
      const speedMult = voiceState === "speaking" ? 1.8 : voiceState === "listening" ? 1.4 : 1.0;
      meshRef.current.rotation.y += delta * (0.05 + anim.arousal * 0.08) * speedMult;
      meshRef.current.rotation.x += delta * 0.02 * speedMult;
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

export default function AuraOrb({ emotion, isThinking, isStreaming, voiceState }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <OrbMesh
        emotion={emotion}
        isThinking={isThinking}
        isStreaming={isStreaming}
        voiceState={voiceState}
      />
    </Canvas>
  );
}
