import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface LogoProps {
  variant?: 'default' | 'light' | 'dark' | 'certificate';
  size?: 'sm' | 'md' | 'lg';
}

export const EdunexaLogo: React.FC<LogoProps> = ({ variant = 'default', size = 'md' }) => {
  const { bootstrap } = useApp();
  const [imgErr, setImgErr] = useState(false);
  const customLogoUrl = bootstrap?.mediaSlots?.website_logo?.url;

  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 32;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const textColor = variant === 'light' ? 'text-white' : 'text-[#10243D]';

  return (
    <span className="inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      {customLogoUrl && !imgErr && variant !== 'certificate' ? (
        <img
          src={customLogoUrl}
          alt="EDUNEXA Logo"
          onError={() => setImgErr(true)}
          style={{ height: iconSize, width: 'auto', maxWidth: iconSize * 2 }}
          className="object-contain rounded shrink-0"
        />
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect
            width="64"
            height="64"
            rx="14"
            fill={variant === 'light' ? '#008F9F' : '#10243D'}
          />
          <path
            d="M17 19H46V26H25V30.5H42V37H25V41.5H46V48.5H17V19Z"
            fill={variant === 'light' ? '#FFFFFF' : '#008F9F'}
          />
          <circle cx="46.5" cy="18.5" r="5" fill="#90DFEC" />
        </svg>
      )}
      <span className={`font-display font-bold tracking-tight ${textSize} ${textColor}`}>
        EDUNEXA
      </span>
    </span>
  );
};
