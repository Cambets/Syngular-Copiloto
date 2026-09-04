import React, { useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface ChatInteractiveSpheresProps {
  isTyping?: boolean;
  className?: string;
}

interface OrbPoint {
  x: number;
  y: number;
  z: number;
  origX: number;
  origY: number;
  origZ: number;
  size: number;
  color: string;
  alpha: number;
  cluster: number; // 0: Top-Right sphere, 1: Bottom-Left sphere, 2: Ambient stars
}

export const ChatInteractiveSpheres: React.FC<ChatInteractiveSpheresProps> = ({ 
  isTyping = false,
  className = ""
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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

    const isLight = theme === "light";

    // High vibrancy palettes for deep & crisp density
    const darkColors = [
      "#d8b4fe", // Neon Lilac 300
      "#c084fc", // Purple 400
      "#a855f7", // Vivid Purple 500
      "#9333ea", // Deep Purple 600
      "#e9d5ff", // Crystal Violet
      "#818cf8", // Electric Indigo
      "#7c3aed", // Deep Violet
      "#ffffff", // Core Spark White
    ];

    const lightColors = [
      "#8b5cf6", // Purple 500
      "#7c3aed", // Violet 600
      "#a78bfa", // Vivid Lilac 400
      "#c4b5fd", // Soft Lilac 300
      "#6366f1", // Indigo 500
      "#818cf8", // Indigo 400
      "#a855f7", // Purple Accent
    ];

    const activeColors = isLight ? lightColors : darkColors;

    const points: OrbPoint[] = [];

    // Orb 1: Ultra-Dense Top-Right 3D Sphere (780 particles)
    const orb1Radius = Math.min(width, height) * 0.26;
    const orb1Count = 780;
    for (let i = 0; i < orb1Count; i++) {
      const u = (i / (orb1Count - 1)) * 2 - 1; // from -1 to 1
      const theta = i * Math.PI * (3 - Math.sqrt(5)); // Golden angle
      const rAtY = Math.sqrt(1 - u * u);

      // Multi-layer shell thickness for volumetric fullness
      const layerVariance = 0.82 + Math.random() * 0.32;
      const r = orb1Radius * layerVariance;
      const x = Math.cos(theta) * rAtY * r + width * 0.28;
      const y = u * r - height * 0.14;
      const z = Math.sin(theta) * rAtY * r;

      points.push({
        x,
        y,
        z,
        origX: x,
        origY: y,
        origZ: z,
        size: isLight ? Math.random() * 2.4 + 1.1 : Math.random() * 2.6 + 1.2,
        color: activeColors[Math.floor(Math.random() * activeColors.length)],
        alpha: isLight ? Math.random() * 0.55 + 0.3 : Math.random() * 0.7 + 0.35,
        cluster: 0,
      });
    }

    // Orb 2: Ultra-Dense Bottom-Left 3D Sphere (680 particles)
    const orb2Radius = Math.min(width, height) * 0.21;
    const orb2Count = 680;
    for (let i = 0; i < orb2Count; i++) {
      const u = (i / (orb2Count - 1)) * 2 - 1;
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      const rAtY = Math.sqrt(1 - u * u);

      const layerVariance = 0.80 + Math.random() * 0.35;
      const r = orb2Radius * layerVariance;
      const x = Math.cos(theta) * rAtY * r - width * 0.26;
      const y = u * r + height * 0.18;
      const z = Math.sin(theta) * rAtY * r;

      points.push({
        x,
        y,
        z,
        origX: x,
        origY: y,
        origZ: z,
        size: isLight ? Math.random() * 2.2 + 1.0 : Math.random() * 2.4 + 1.1,
        color: activeColors[Math.floor(Math.random() * activeColors.length)],
        alpha: isLight ? Math.random() * 0.5 + 0.28 : Math.random() * 0.65 + 0.32,
        cluster: 1,
      });
    }

    // Ambient floating constellation & cosmic sparkles (420 particles)
    const starCount = 420;
    for (let i = 0; i < starCount; i++) {
      const sx = (Math.random() - 0.5) * width * 1.05;
      const sy = (Math.random() - 0.5) * height * 1.05;
      const sz = (Math.random() - 0.5) * 260;

      points.push({
        x: sx,
        y: sy,
        z: sz,
        origX: sx,
        origY: sy,
        origZ: sz,
        size: Math.random() * 1.8 + 0.8,
        color: activeColors[Math.floor(Math.random() * (activeColors.length - 1))],
        alpha: isLight ? Math.random() * 0.45 + 0.2 : Math.random() * 0.55 + 0.2,
        cluster: 2,
      });
    }

    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - width / 2;
      const clientY = e.clientY - rect.top - height / 2;
      targetRotY = (clientX / width) * 0.55;
      targetRotX = -(clientY / height) * 0.55;
    };

    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;

    const render = () => {
      time += isTyping ? 0.038 : 0.016;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Deep Purple Glowing Ambient Radiance
      const glow1 = ctx.createRadialGradient(
        centerX + width * 0.28,
        centerY - height * 0.14,
        15,
        centerX + width * 0.28,
        centerY - height * 0.14,
        orb1Radius * 1.85
      );
      if (isLight) {
        glow1.addColorStop(0, isTyping ? "rgba(167, 139, 250, 0.28)" : "rgba(196, 181, 253, 0.20)");
        glow1.addColorStop(0.45, "rgba(221, 214, 254, 0.08)");
        glow1.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glow1.addColorStop(0, isTyping ? "rgba(192, 132, 252, 0.35)" : "rgba(168, 85, 247, 0.25)");
        glow1.addColorStop(0.5, "rgba(126, 34, 206, 0.10)");
        glow1.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = glow1;
      ctx.beginPath();
      ctx.arc(centerX + width * 0.28, centerY - height * 0.14, orb1Radius * 1.85, 0, Math.PI * 2);
      ctx.fill();

      const glow2 = ctx.createRadialGradient(
        centerX - width * 0.26,
        centerY + height * 0.18,
        15,
        centerX - width * 0.26,
        centerY + height * 0.18,
        orb2Radius * 1.85
      );
      if (isLight) {
        glow2.addColorStop(0, isTyping ? "rgba(196, 181, 253, 0.25)" : "rgba(167, 139, 250, 0.18)");
        glow2.addColorStop(0.45, "rgba(237, 233, 254, 0.07)");
        glow2.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glow2.addColorStop(0, isTyping ? "rgba(168, 85, 247, 0.30)" : "rgba(147, 51, 234, 0.20)");
        glow2.addColorStop(0.5, "rgba(88, 28, 135, 0.08)");
        glow2.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = glow2;
      ctx.beginPath();
      ctx.arc(centerX - width * 0.26, centerY + height * 0.18, orb2Radius * 1.85, 0, Math.PI * 2);
      ctx.fill();

      // Smooth rotation with slight auto-floating motion
      rotX += (targetRotX - rotX) * 0.045 + Math.sin(time * 0.6) * 0.0007;
      rotY += (targetRotY - rotY) * 0.045 + Math.cos(time * 0.5) * 0.0015;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Project particles to 2D
      const projected = points.map((p, idx) => {
        // Conversational breathing oscillation / pulse
        const pulseFrequency = isTyping ? 4.8 : 1.9;
        const pulseAmp = isTyping ? 8 : 4.0;
        const breathe = 1 + Math.sin(time * pulseFrequency + idx * 0.08) * (pulseAmp / 100);

        // Center calculation based on cluster
        let offsetX = 0;
        let offsetY = 0;
        if (p.cluster === 0) {
          offsetX = width * 0.28;
          offsetY = -height * 0.14;
        } else if (p.cluster === 1) {
          offsetX = -width * 0.26;
          offsetY = height * 0.18;
        }

        const localX = (p.origX - offsetX) * breathe;
        const localY = (p.origY - offsetY) * breathe;
        const localZ = p.origZ * breathe;

        // Rotate individual spheres
        const x1 = localX * cosY + localZ * sinY;
        const z1 = -localX * sinY + localZ * cosY;

        const y2 = localY * cosX - z1 * sinX;
        const z2 = localY * sinX + z1 * cosX;

        const finalX = x1 + offsetX;
        const finalY = y2 + offsetY;

        // 3D Perspective Projection
        const fov = 540;
        const scale = fov / (fov + z2);
        const projX = centerX + finalX * scale;
        const projY = centerY + finalY * scale;

        return {
          projX,
          projY,
          scale,
          z: z2,
          size: p.size * scale,
          color: p.color,
          alpha: isLight 
            ? Math.min(0.85, Math.max(0.18, ((z2 + 200) / 400) * 0.65 + 0.25))
            : Math.min(1, Math.max(0.20, ((z2 + 200) / 400) * 0.80 + 0.30)),
          cluster: p.cluster,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      // Draw luminous filaments connecting nearby particles
      ctx.lineWidth = isLight ? 0.5 : 0.6;
      for (let i = 0; i < projected.length; i += 3) {
        if (projected[i].cluster === 2) continue;
        for (let j = i + 1; j < Math.min(i + 5, projected.length); j++) {
          if (projected[i].cluster !== projected[j].cluster) continue;
          const dx = projected[i].projX - projected[j].projX;
          const dy = projected[i].projY - projected[j].projY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = projected[i].cluster === 0 ? 32 : 28;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * (isLight ? 0.28 : 0.35) * projected[i].alpha;
            ctx.strokeStyle = isLight ? `rgba(139, 92, 246, ${lineAlpha})` : `rgba(192, 132, 252, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].projX, projected[i].projY);
            ctx.lineTo(projected[j].projX, projected[j].projY);
            ctx.stroke();
          }
        }
      }

      // Draw 3D Glowing Particles
      for (const p of projected) {
        ctx.save();
        ctx.globalAlpha = isTyping ? Math.min(1, p.alpha * 1.3) : p.alpha;

        if (!isLight) {
          ctx.shadowBlur = 9 * p.scale;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 5 * p.scale;
          ctx.shadowColor = p.color;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, Math.max(0.9, p.size), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, isTyping]);

  return (
    <div className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`}>
      {/* Background Gradients: Soft Lavender in Light Mode vs Deep Cosmic in Dark Mode */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-950 via-[#140c26] to-[#0a0514] opacity-95' 
            : 'bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100/50 opacity-90'
        }`} 
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300 ${
          theme === 'dark' ? 'opacity-90' : 'opacity-70'
        }`}
      />
    </div>
  );
};
