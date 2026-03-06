"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { Mesh } from "three";
import { Environment, Float } from "@react-three/drei";

function OctagonMesh() {
    const meshRef = useRef<Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.2;
            meshRef.current.rotation.x += delta * 0.1;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} scale={2.5}>
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                    color="#D20A0A"
                    wireframe
                    emissive="#D20A0A"
                    emissiveIntensity={2}
                    transparent
                    opacity={0.3}
                />
            </mesh>
            {/* Inner Glow */}
            <mesh scale={2.4}>
                <octahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#C5B358" wireframe transparent opacity={0.1} />
            </mesh>
        </Float>
    );
}

// Check if WebGL is supported
function isWebGLSupported(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const canvas = document.createElement("canvas");
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
    } catch {
        return false;
    }
}

export function HeroScene() {
    const [canRender, setCanRender] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Only render 3D on client-side and if WebGL is supported
        if (typeof window !== "undefined" && isWebGLSupported()) {
            setCanRender(true);
        }
    }, []);

    // Don't render if WebGL not supported or if there was an error
    if (!canRender || hasError) {
        return null;
    }

    return (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
            <Canvas 
                camera={{ position: [0, 0, 5] }}
                onError={() => setHasError(true)}
                fallback={null}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#C5B358" />
                <OctagonMesh />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
