import React from 'react';

interface SyngularLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * 🏷️ Official Brand Logo: The official '·y' mark + "Syn+" wordmark
 * Used in Topbars, Sidebar, Navigation, Login and Page Headers.
 */
export const SyngularLogo: React.FC<SyngularLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick
}) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : size === 'xl' ? 'w-13 h-13' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : size === 'xl' ? 'text-2xl' : 'text-sm';

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-2 min-w-0 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      title={onClick ? 'Ir para o Início' : 'Syn+'}
    >
      {/* 🟣 Official '·y' Emblem */}
      <div className={`${iconSize} rounded-xl bg-purple-50 border border-purple-200/80 p-1 flex items-center justify-center shadow-2xs transition-transform duration-150 group-hover:scale-105 shrink-0 relative overflow-hidden`}>
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full text-[#7c3aed]"
        >
          {/* Dot at upper left */}
          <circle cx="7.5" cy="11.5" r="3.2" fill="#7c3aed" />
          
          {/* Bold geometric 'y' */}
          <path 
            d="M12.5 10.5H16.2L18.8 17.8L21.4 10.5H25.1L20.6 21.2C19.6 23.6 18.3 25.2 16.7 26.1C15.2 27 13.3 27.2 11.2 26.8V23.7C12.4 23.9 13.4 23.8 14.2 23.4C15 22.9 15.6 22 16.1 20.7L12.5 10.5Z" 
            fill="#7c3aed"
          />
        </svg>
      </div>

      {showText && (
        <span className={`${textSize} font-black tracking-tight text-slate-900 leading-none group-hover:text-[#7c3aed] transition-colors flex items-center`}>
          <span>Syn</span>
          <span className="text-[#7c3aed] ml-0.5 font-black">+</span>
        </span>
      )}
    </div>
  );
};

interface SynRobotMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

/**
 * 🤖 Friendly Robot Mascot: The Copilot companion avatar
 * Used on the left of the Hero Card and assistant messages.
 */
export const SynRobotMascot: React.FC<SynRobotMascotProps> = ({
  size = 'md',
  className = '',
  onClick
}) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : size === 'xl' ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-8 h-8';

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      title="Syn Copiloto"
    >
      <div className={`${iconSize} rounded-2xl bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] p-1.5 flex items-center justify-center shadow-md shadow-purple-900/10 transition-transform duration-150 group-hover:scale-105 relative overflow-hidden`}>
        
        {/* Soft specular reflection */}
        <div className="absolute inset-0 bg-radial from-white/25 via-transparent to-transparent pointer-events-none rounded-2xl"></div>

        {/* Crisp Vector Robot Mascot */}
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full text-white"
        >
          {/* Subtle Dynamic Orbit */}
          <ellipse 
            cx="16" 
            cy="16" 
            rx="12.5" 
            ry="7" 
            stroke="rgba(255, 255, 255, 0.45)" 
            strokeWidth="1.2" 
            strokeDasharray="2.5 2"
            transform="rotate(-22 16 16)"
          />

          {/* Spark Star */}
          <path 
            d="M24 6C24 7.5 25.5 7.5 25.5 7.5C25.5 7.5 24 7.5 24 9C24 7.5 22.5 7.5 22.5 7.5C22.5 7.5 24 7.5 24 6Z" 
            fill="#ffffff"
          />

          {/* Inner Face Core */}
          <rect 
            x="7.5" 
            y="9.5" 
            width="17" 
            height="13" 
            rx="6.5" 
            fill="#5b21b6" 
            stroke="rgba(255,255,255,0.3)" 
            strokeWidth="1"
          />

          {/* Friendly Glowing Eyes */}
          <rect 
            x="11" 
            y="13.5" 
            width="2.8" 
            height="4.5" 
            rx="1.4" 
            fill="#ffffff"
          />
          <rect 
            x="18.2" 
            y="13.5" 
            width="2.8" 
            height="4.5" 
            rx="1.4" 
            fill="#ffffff"
          />

          {/* Subtle Smile */}
          <path 
            d="M14.5 19.5C15.2 20.2 16.8 20.2 17.5 19.5" 
            stroke="#ffffff" 
            strokeWidth="1.2" 
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

// Aliases for backwards compatibility
export const SyngularDotYLogo = SyngularLogo;
