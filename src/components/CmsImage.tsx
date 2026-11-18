import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CmsImageProps {
  slotKey: string;
  fallbackAlt?: string;
  className?: string;
  overrideUrl?: string;
}

export const CmsImage: React.FC<CmsImageProps> = ({
  slotKey,
  fallbackAlt = 'EDUNEXA educational visual',
  className = 'w-full h-full object-cover',
  overrideUrl,
}) => {
  const { bootstrap } = useApp();
  const [hasError, setHasError] = useState(false);

  const slot = bootstrap?.mediaSlots?.[slotKey];
  const src = overrideUrl || slot?.url;
  const alt = slot?.alt || fallbackAlt;

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EAF9FB] text-[#10243D] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-8 h-8 text-[#008F9F] mb-2" />
        <span className="font-display font-semibold text-sm">{slot?.label || 'EDUNEXA Visual Slot'}</span>
        <span className="text-xs text-[#64748B] mt-1">Manage via Website Media Manager</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
