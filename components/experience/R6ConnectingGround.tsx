"use client";

/**
 * Shared connector plane: deliberately opaque and texture-free. R5's broad
 * transparent floor amplified tiled AO/ground artifacts in screenshots.
 */
export function R6ConnectingGround({ quality }: { quality: "high" | "medium" }) {
  return (
    <group position={[0, -1.53, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={quality === "high"}>
        <planeGeometry args={[84, 70, 1, 1]} />
        <meshStandardMaterial color="#d8d3c8" roughness={0.98} metalness={0} />
      </mesh>
      <mesh position={[0, 0.006, -13]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[70, 4]} />
        <meshStandardMaterial color="#646762" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 0.012, -13]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[64, 0.055]} />
        <meshBasicMaterial color="#eee9dd" />
      </mesh>
    </group>
  );
}
