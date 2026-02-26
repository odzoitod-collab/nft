import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface SuccessOverlayProps {
  isVisible: boolean;
  onHide: () => void;
  /** Текст под галочкой (опционально) */
  message?: string;
}

const SuccessOverlay: React.FC<SuccessOverlayProps> = ({ isVisible, onHide, message }) => {
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(onHide, 1800);
    return () => clearTimeout(t);
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-live="polite"
      role="status"
    >
      <div className="success-checkmark-circle">
        <Check className="success-checkmark-icon" strokeWidth={3} />
      </div>
      {message && (
        <p className="mt-4 text-white font-medium text-center px-4 max-w-[280px] animate-fade-in">
          {message}
        </p>
      )}
    </div>
  );
};

export default SuccessOverlay;
