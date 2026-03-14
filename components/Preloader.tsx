import React from 'react';

interface PreloaderProps {
  visible: boolean;
  /** После load: скрытие 300ms, затем unmount через 500ms */
  hiding?: boolean;
}

const Preloader: React.FC<PreloaderProps> = ({ visible, hiding = false }) => {
  return (
    <div
      id="preloader"
      className={`preloader${hiding ? ' preloader-is-hidden' : ''}`}
      style={{ zIndex: 100 }}
      aria-hidden={!visible}
    >
      <div className="preloader-content">
        {/* Ethos логотип — буква E в скруглённом квадрате */}
        <div className="preloader-logo preloader-logo-pulse">
          <svg viewBox="0 0 32 32" width={64} height={64} aria-hidden>
            <rect width={32} height={32} rx={6} fill="var(--accent)" />
            <text x={16} y={22} textAnchor="middle" fill="white" fontSize={18} fontWeight={700} fontFamily="system-ui, sans-serif">
              E
            </text>
          </svg>
        </div>
        {/* Прогресс-бар 120×2px, accent, 0→100% */}
        <div className="preloader-progress-track">
          <div className="preloader-progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default Preloader;
