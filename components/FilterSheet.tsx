import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  subLabel?: string;
  image?: string;
  color?: string;
  floorPrice: number;
  change?: string;
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  title,
  options,
  selectedValues,
  onToggle,
  onClear,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-tg-card rounded-t-xl border-t border-white/5 shadow-2xl sheet-panel"
        role="dialog"
        aria-modal
        aria-labelledby="filter-sheet-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 id="filter-sheet-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-tg-hint hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint pointer-events-none" />
            <input
              type="text"
              placeholder={`Поиск`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-tg-bg border border-white/5 text-sm text-white placeholder-tg-hint outline-none focus:border-white/10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="py-12 text-center text-sm text-tg-hint">Нет вариантов</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.id);
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(opt.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors active:opacity-80"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-tg-button border-tg-button' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                      </div>
                      {opt.image && (
                        <img
                          src={opt.image}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-white/5"
                        />
                      )}
                      {!opt.image && opt.color && (
                        <div
                          className="w-9 h-9 rounded-lg flex-shrink-0 border border-white/5"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-white text-sm block truncate">
                          {opt.label}
                        </span>
                        <span className="text-xs text-tg-hint">
                          от {opt.floorPrice} TON
                        </span>
                      </div>
                      {opt.subLabel && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-tg-button/20 text-tg-button">
                          {opt.subLabel}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex gap-2 bg-tg-card pb-safe">
          <button
            type="button"
            onClick={onClear}
            className="flex-1 h-10 rounded-lg text-sm font-medium text-tg-hint border border-white/5 hover:bg-white/5 hover:text-white transition-colors"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-lg text-sm font-medium text-white bg-tg-button hover:opacity-90 transition-opacity"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterSheet;
