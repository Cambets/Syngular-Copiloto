import React, { useEffect, useRef } from "react";

interface PurpleParticleOrbProps {
  className?: string;
  particleCount?: number;
  radius?: number;
  interactive?: boolean;
}

interface Particle3D {
  origX: number;
  origY: number;
  origZ: number;
  size: number;
  color: string;
  glowColor: string;
  baseAlpha: number;
  isLetter: boolean;
  waveOffset: number;
  waveSpeed: number;
}

interface ProjectedParticle {
  projX: number;
  projY: number;
  size: number;
  glowSize: number;
  color: string;
  glowColor: string;
  alpha: number;
  glowAlpha: number;
  z: number;
  isLetter: boolean;
}

export const PurpleParticleOrb: React.FC<PurpleParticleOrbProps> = ({
  className = "",
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Paleta Neon & Violeta Brilhante com cores de núcleo e halo
    const particlePalette = [
      { core: "#ffffff", glow: "rgba(233, 213, 255, 0.45)" }, // Crystal Core
      { core: "#f3e8ff", glow: "rgba(216, 180, 254, 0.50)" }, // Lilac 200
      { core: "#d8b4fe", glow: "rgba(192, 132, 252, 0.55)" }, // Purple 300
      { core: "#c084fc", glow: "rgba(168, 85, 247, 0.50)" }, // Purple 400
      { core: "#a855f7", glow: "rgba(147, 51, 234, 0.45)" }, // Vivid Violet 500
      { core: "#818cf8", glow: "rgba(99, 102, 241, 0.40)" }, // Indigo 400
    ];

    // 1. Gerar Matriz 3D Volumétrica do "S" com amostragem otimizada
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 460;
    offCanvas.height = 620;
    const offCtx = offCanvas.getContext("2d");

    const particles: Particle3D[] = [];

    if (offCtx) {
      offCtx.fillStyle = "#ffffff";
      offCtx.font = "900 560px 'Montserrat', 'Inter', 'Segoe UI', sans-serif";
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.fillText("S", offCanvas.width / 2, offCanvas.height / 2 + 10);

      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;

      // Amostragem com resolução balanceada e alta performance (step 7)
      const step = 7;
      for (let py = 0; py < offCanvas.height; py += step) {
        for (let px = 0; px < offCanvas.width; px += step) {
          const idx = (py * offCanvas.width + px) * 4;
          const alpha = data[idx + 3];

          if (alpha > 120) {
            const cx = (px - offCanvas.width / 2) * 1.08;
            const cy = (py - offCanvas.height / 2) * 1.08;

            // Profundidade Z volumétrica suave
            const depthZ = (Math.random() - 0.5) * 95;
            const palette = particlePalette[Math.floor(Math.random() * particlePalette.length)];

            particles.push({
              origX: cx + (Math.random() - 0.5) * 3,
              origY: cy + (Math.random() - 0.5) * 3,
              origZ: depthZ,
              size: Math.random() * 2.2 + 1.2,
              color: palette.core,
              glowColor: palette.glow,
              baseAlpha: Math.random() * 0.4 + 0.6,
              isLetter: true,
              waveOffset: Math.random() * Math.PI * 2,
              waveSpeed: Math.random() * 1.2 + 0.8,
            });
          }
        }
      }
    }

    // 2. Halo Cósmico / Partículas Orbitais leves ao redor do S
    const ambientCount = 180;
    const haloRadius = 340;
    for (let i = 0; i < ambientCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const r = haloRadius * (0.75 + Math.random() * 0.55);

      const hx = r * Math.cos(theta) * Math.cos(phi);
      const hy = r * Math.sin(phi) * 1.15;
      const hz = r * Math.sin(theta) * Math.cos(phi);
      const palette = particlePalette[Math.floor(Math.random() * (particlePalette.length - 1))];

      particles.push({
        origX: hx,
        origY: hy,
        origZ: hz,
        size: Math.random() * 1.6 + 0.8,
        color: palette.core,
        glowColor: palette.glow,
        baseAlpha: Math.random() * 0.4 + 0.2,
        isLetter: false,
        waveOffset: Math.random() * Math.PI * 2,
        waveSpeed: Math.random() * 0.8 + 0.4,
      });
    }

    // Buffer pré-alocado para evitar alocações de memória constantes (Zero GC)
    const projectedPool: ProjectedParticle[] = particles.map(() => ({
      projX: 0,
      projY: 0,
      size: 0,
      glowSize: 0,
      color: "",
      glowColor: "",
      alpha: 0,
      glowAlpha: 0,
      z: 0,
      isLetter: false,
    }));

    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - width / 2;
      const clientY = e.clientY - rect.top - height / 2;
      targetRotY = (clientX / width) * 0.55;
      targetRotX = -(clientY / height) * 0.55;
    };

    if (interactive) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    let time = 0;
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const delta = Math.min((now - lastTimestamp) / 1000, 0.033);
      lastTimestamp = now;
      time += delta * 1.2;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Aura de Brilho Central Suave (Fundo)
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        420
      );
      glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.28)");
      glowGrad.addColorStop(0.4, "rgba(139, 92, 246, 0.14)");
      glowGrad.addColorStop(0.8, "rgba(88, 28, 135, 0.04)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 420, 0, Math.PI * 2);
      ctx.fill();

      // Interpolação física ultra-suave (Lerp com velocidade consistente)
      const lerpFactor = Math.min(delta * 4.5, 0.15);
      rotX += (targetRotX - rotX) * lerpFactor + Math.sin(time * 0.8) * 0.0006;
      rotY += (targetRotY - rotY) * lerpFactor + Math.cos(time * 0.6) * 0.0012;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const fov = 540;

      // Projeção 3D Direta sem alocação de objetos
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const proj = projectedPool[i];

        // Onda de respiração orgânica
        const wave = Math.sin(time * p.waveSpeed + p.waveOffset) * (p.isLetter ? 3.0 : 6.0);
        const curX = p.origX;
        const curY = p.origY + wave;
        const curZ = p.origZ;

        // Rotação 3D
        const x1 = curX * cosY + curZ * sinY;
        const z1 = -curX * sinY + curZ * cosY;

        const y2 = curY * cosX - z1 * sinX;
        const z2 = curY * sinX + z1 * cosX;

        const scale = fov / (fov + z2);
        
        proj.projX = centerX + x1 * scale;
        proj.projY = centerY + y2 * scale;
        proj.size = Math.max(0.8, p.size * scale);
        proj.glowSize = proj.size * (p.isLetter ? 2.8 : 2.2);
        proj.color = p.color;
        proj.glowColor = p.glowColor;
        proj.z = z2;
        proj.isLetter = p.isLetter;

        const depthFactor = Math.min(1, Math.max(0.2, (z2 + 200) / 400));
        proj.alpha = p.baseAlpha * (p.isLetter ? depthFactor * 0.6 + 0.4 : depthFactor * 0.5 + 0.15);
        proj.glowAlpha = proj.alpha * 0.6;
      }

      // 3. Renderização Otimizada de Alta Performance (2 Passos: Halos + Núcleos Brilhantes)
      
      // Passo A: Halos de Brilho Suave (substitui shadowBlur sem perda de FPS)
      for (let i = 0; i < projectedPool.length; i++) {
        const p = projectedPool[i];
        ctx.globalAlpha = p.glowAlpha;
        ctx.fillStyle = p.glowColor;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, p.glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Passo B: Núcleos Nítidos e Pontos de Luz
      for (let i = 0; i < projectedPool.length; i++) {
        const p = projectedPool[i];
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (interactive) {
        window.removeEventListener("mousemove", handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full will-change-transform ${className}`}
    />
  );
};
