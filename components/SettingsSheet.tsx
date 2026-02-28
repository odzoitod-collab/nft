import React, { useState, useEffect } from 'react';
import { X, Shield, HelpCircle, Bell, ChevronRight, ChevronLeft, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import { getSupportUsername } from '../services/supabaseClient';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'main' | 'notifications' | 'privacy' | 'help';

const SettingsSheet: React.FC<SettingsSheetProps> = ({ isOpen, onClose }) => {
  const [currentTab, setCurrentTab] = useState<SettingsTab>('main');
  const [supportUsername, setSupportUsername] = useState<string>('your_support_username');

  useEffect(() => {
    const loadSupportUsername = async () => {
      try {
        const username = await getSupportUsername();
        setSupportUsername(username || 'your_support_username');
      } catch (error) {
        console.error('Error loading support username:', error);
      }
    };

    if (isOpen) {
      loadSupportUsername();
    }
  }, [isOpen]);

  const supportLink = supportUsername.replace(/^@/, '');

  if (!isOpen) return null;

  const handleBack = () => {
    setCurrentTab('main');
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setCurrentTab('main'), 300); // Reset after animation
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={handleClose} aria-hidden />
      <div className="bg-tg-card w-full rounded-t-xl max-w-md mx-auto relative overflow-hidden flex flex-col h-[70vh] border-t border-white/5 shadow-2xl sheet-panel">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
                {currentTab !== 'main' && (
                    <button onClick={handleBack} className="mr-2 text-tg-hint hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}
                <h2 className="text-xl font-bold text-white tracking-tight">
                    {currentTab === 'main' ? 'Настройки' :
                     currentTab === 'notifications' ? 'Уведомления' :
                     currentTab === 'privacy' ? 'Конфиденциальность' : 'Помощь'}
                </h2>
            </div>
            <button onClick={handleClose} className="bg-white/10 rounded-full p-1.5 text-tg-hint hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 relative">
            
            {/* Main Menu */}
            {currentTab === 'main' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-tg-card rounded-2xl overflow-hidden border border-white/5">
                        <SettingsItem 
                            icon={<Bell className="w-5 h-5" />} 
                            label="Уведомления" 
                            color="bg-red-500" 
                            onClick={() => setCurrentTab('notifications')}
                        />
                        <SettingsItem 
                            icon={<Shield className="w-5 h-5" />} 
                            label="Конфиденциальность" 
                            color="bg-green-500" 
                            onClick={() => setCurrentTab('privacy')}
                        />
                        <SettingsItem 
                            icon={<HelpCircle className="w-5 h-5" />} 
                            label="Помощь" 
                            color="bg-orange-500" 
                            onClick={() => setCurrentTab('help')}
                        />
                    </div>
                    
                    <div className="text-center pt-8 opacity-50">
                        <p className="text-xs font-medium">Ethos Gallery v1.1.0</p>
                    </div>
                </div>
            )}

            {/* Notifications Sub-menu */}
            {currentTab === 'notifications' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-tg-card rounded-2xl overflow-hidden border border-white/5 p-1">
                        <ToggleItem label="Новые ставки" description="Уведомления о перебитых ставках" />
                        <ToggleItem label="Продажа предмета" description="Когда ваш NFT куплен" />
                        <ToggleItem label="Портфель" description="Покупки и проданные NFT" />
                    </div>
                     <div className="bg-tg-card rounded-2xl overflow-hidden border border-white/5 p-1">
                        <ToggleItem label="Новости Маркета" description="Анонсы новых сезонов" defaultChecked={false} />
                    </div>
                </div>
            )}

            {/* Privacy Sub-menu */}
            {currentTab === 'privacy' && (
                <div className="space-y-4 animate-fade-in">
                     <div className="bg-tg-card rounded-2xl overflow-hidden border border-white/5 p-1">
                        <ToggleItem label="Показывать баланс" description="Скрыть баланс на главном экране" defaultChecked={true} />
                        <ToggleItem label="Разрешить сообщения" description="От других участников маркета" defaultChecked={false} />
                    </div>
                </div>
            )}

            {/* Help Sub-menu */}
            {currentTab === 'help' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-tg-card rounded-2xl overflow-hidden border border-white/5">
                        <a 
                            href={`https://t.me/${supportLink}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-tg-button/20 flex items-center justify-center">
                                    <HelpCircle className="w-5 h-5 text-tg-button" />
                                </div>
                                <div>
                                    <div className="font-semibold text-white">Техподдержка</div>
                                    <div className="text-xs text-tg-hint">Связаться с поддержкой</div>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-tg-hint" />
                        </a>
                        <div 
                            onClick={() => window.open(`https://t.me/${supportLink}`, '_blank')}
                            className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between"
                        >
                            <span className="font-medium text-red-400">Сообщить о проблеме</span>
                            <ExternalLink className="w-4 h-4 text-red-400" />
                        </div>
                    </div>
                    <div className="bg-tg-card rounded-2xl p-4 border border-white/5">
                        <h3 className="font-semibold text-white mb-2">Часто задаваемые вопросы</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="font-medium text-white">Как пополнить баланс?</p>
                                <p className="text-tg-hint text-xs mt-1">Нажмите на кнопку с балансом в верхней части экрана</p>
                            </div>
                            <div>
                                <p className="font-medium text-white">Как продать NFT?</p>
                                <p className="text-tg-hint text-xs mt-1">Откройте NFT из инвентаря и нажмите "Предложить цену"</p>
                            </div>
                            <div>
                                <p className="font-medium text-white">Когда я получу деньги?</p>
                                <p className="text-tg-hint text-xs mt-1">После покупки вашего NFT средства поступят на баланс</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-tg-hint px-4 leading-relaxed">
                        Если вы столкнулись с мошенничеством или технической ошибкой, пожалуйста, свяжитесь с нашей службой поддержки немедленно.
                    </p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

interface SettingsItemProps {
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon, label, color, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-lg`}>
                {icon}
            </div>
            <span className="text-[15px] font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-tg-hint/50" />
        </div>
    </button>
);

const ToggleItem: React.FC<{ label: string; description: string; defaultChecked?: boolean }> = ({ label, description, defaultChecked = true }) => {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <div className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
            <div>
                <div className="text-[15px] font-medium text-white">{label}</div>
                <div className="text-xs text-tg-hint mt-0.5">{description}</div>
            </div>
            <button type="button" onClick={() => setChecked(!checked)} className="text-tg-button transition-colors">
                {checked ? (
                    <ToggleRight className="w-10 h-10 fill-tg-button/20" />
                ) : (
                    <ToggleLeft className="w-10 h-10 text-tg-hint" />
                )}
            </button>
        </div>
    )
};

export default SettingsSheet;