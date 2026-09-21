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
  const [imgError, setImgError] = React.useState(false);
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : size === 'xl' ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-10 h-10';

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      title="SynCop - Copiloto de Vendas"
    >
      <div className={`${iconSize} rounded-2xl bg-white dark:bg-[#15102a] border border-purple-200/80 dark:border-purple-800/80 p-0.5 flex items-center justify-center shadow-md shadow-purple-900/10 transition-transform duration-200 group-hover:scale-105 relative overflow-hidden`}>
        {!imgError ? (
          <img 
            src="/syncop-mascot.png" 
            alt="SynCop" 
            onError={() => setImgError(true)}
            className="w-full h-full object-contain rounded-xl"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-white font-bold text-xs">
            🤖
          </div>
        )}
      </div>
    </div>
  );
};

// Aliases for backwards compatibility
export const SyngularDotYLogo = SyngularLogo;
