import React from 'react';
import { Smartphone } from 'lucide-react';

/**
 * Заглушка при альбомной ориентации.
 * Mini App поддерживает только portrait.
 */
const LandscapeStub: React.FC = () => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] px-6">
    <Smartphone className="w-16 h-16 text-[var(--text-tertiary)] mb-4 rotate-90" aria-hidden />
    <p className="text-center text-lg font-semibold">Поверните устройство</p>
    <p className="text-center text-sm text-[var(--text-tertiary)] mt-2">
      Ethos Gallery работает только в портретной ориентации
    </p>
  </div>
);

export default LandscapeStub;
