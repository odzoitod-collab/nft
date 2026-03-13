import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { haptic } from '../services/telegramWebApp';

interface SuccessOverlayProps {
  isVisible: boolean;
  onHide: () => void;
  /** Текст под галочкой (опционально) */
  message?: string;
}

const SuccessOverlay: React.FC<SuccessOverlayProps> = ({ isVisible, onHide, message }) => {
  useEffect(() => {
    if (!isVisible) return;
    haptic.success();
    const t = setTimeout(onHide, 2000);
    return () => clearTimeout(t);
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm success-overlay"
      aria-live="polite"
      role="status"
    >
      <div className="success-checkmark-circle">
        <Check className="success-checkmark-icon" strokeWidth={3} />
      </div>
      {message && (
        <p className="mt-4 text-white font-medium text-center px-4 max-w-[280px] success-overlay-text">
          {message}
        </p>
      )}
    </div>
  );
};

export default SuccessOverlay;
