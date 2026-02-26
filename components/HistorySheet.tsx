import React from 'react';
import { X, ArrowUpRight, ArrowDownLeft, ShoppingBag, Gift, Clock } from 'lucide-react';
import { Transaction } from '../types';

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  history: Transaction[];
}

const HistorySheet: React.FC<HistorySheetProps> = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={onClose} aria-hidden />
      
      <div className="bg-tg-card w-full rounded-t-xl max-w-md mx-auto relative overflow-hidden flex flex-col h-[75vh] shadow-2xl border-t border-white/5 sheet-panel">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h2 className="text-xl font-bold text-white tracking-tight">История активности</h2>
            <button onClick={onClose} className="bg-white/10 rounded-full p-1.5 text-tg-hint hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
            {history.length > 0 ? (
                history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-tg-card rounded-2xl border border-white/5 active:scale-[0.98] transition-transform animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${
                                item.type === 'buy' ? 'bg-red-500/10 text-red-500' :
                                item.type === 'withdraw' ? 'bg-orange-500/10 text-orange-500' :
                                item.type === 'sell' || item.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                                'bg-purple-500/10 text-purple-500'
                            }`}>
                                {item.type === 'buy' ? <ShoppingBag className="w-5 h-5" /> :
                                 item.type === 'withdraw' ? <ArrowUpRight className="w-5 h-5" /> :
                                 item.type === 'sell' ? <Gift className="w-5 h-5" /> :
                                 <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="font-bold text-white text-[15px]">{item.title}</div>
                                <div className="text-xs text-tg-hint font-medium">{item.date}</div>
                            </div>
                        </div>
                        <div className={`font-bold text-sm ${
                            item.amount.startsWith('+') ? 'text-green-500' : 
                            item.amount.startsWith('-') ? 'text-white' : 'text-purple-400'
                        }`}>
                            {item.amount}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-tg-hint" />
                    </div>
                    <p className="text-tg-hint font-medium">История пуста</p>
                    <p className="text-xs text-tg-hint/50 mt-1">Здесь появятся ваши транзакции</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default HistorySheet;