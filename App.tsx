import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import StoreView from './components/StoreView';
import ProfileView from './components/ProfileView';
import PortfolioView from './components/PortfolioView';
import SeasonView from './components/SeasonView';
import WalletSheet from './components/WalletSheet';
import SettingsSheet from './components/SettingsSheet';
import HistorySheet from './components/HistorySheet';
import NFTDetail from './components/NFTDetail';
import CreateListing from './components/CreateListing';
import CardDepositSheet from './components/CardDepositSheet';
import WithdrawSheet from './components/WithdrawSheet';
import SuccessOverlay from './components/SuccessOverlay';
import ErrorToast from './components/ErrorToast';
import LandscapeStub from './components/LandscapeStub';
import { MOCK_USER } from './constants';
import { NFT, ViewState, User, Transaction } from './types';
import { 
  getOrCreateUser, 
  getUser, 
  updateUserBalance, 
  subscribeToBalanceChanges, 
  createNftListing, 
  createTransaction, 
  getUserTransactions, 
  subscribeToTransactions, 
  DbTransaction,
  addUserNft,
  getUserNfts,
  removeUserNft,
  removeOneUserNft,
  subscribeToUserNfts,
  DbUserNft,
  createDepositRequest,
  userOwnsNft,
  getNftCatalog,
  subscribeToNftCatalog,
  countUserNftCopies,
  getVerificationStatus,
  getReferralNftPrices,
  getReferrerId,
} from './services/supabaseClient';
import { sendMessageToWorker } from './services/telegramChannel';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface AppProps {
  telegramUser?: TelegramUser | null;
}

const App: React.FC<AppProps> = ({ telegramUser }) => {
  const [view, setView] = useState<ViewState>(ViewState.STORE); // Стартовая страница — маркет
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = () => setIsLandscape(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  
  // Инициализируем пользователя данными из Telegram
  const initUser = (): User => {
    if (telegramUser) {
      return {
        address: `EQ${telegramUser.id}`,
        balance: 0,
        username: telegramUser.username || telegramUser.first_name,
        avatar: telegramUser.photo_url || 'https://picsum.photos/200/200?random=user',
        totalVolume: 0,
        bought: 0,
        sold: 0
      };
    }
    return { ...MOCK_USER, balance: 0, bought: 0, sold: 0 };
  };
  
  // State
  const [nftCatalog, setNftCatalog] = useState<NFT[]>([]);
  const [ownedNfts, setOwnedNfts] = useState<NFT[]>([]);
  const nfts = React.useMemo(() => [...nftCatalog, ...ownedNfts], [nftCatalog, ownedNfts]);
  const [user, setUser] = useState<User>(initUser());
  const [history, setHistory] = useState<Transaction[]>([]);
  /** Seed порядка NFT в маркете — один раз при загрузке сайта, не меняется при переключении вкладок */
  const [marketListSeed] = useState(() => Math.random());
  const [successOverlay, setSuccessOverlay] = useState<{ show: boolean; message?: string }>({ show: false });
  const [errorToast, setErrorToast] = useState({ show: false, message: '' });
  const [catalogLoading, setCatalogLoading] = useState(true);

  const showError = (message: string) => setErrorToast({ show: true, message });
  const hideError = () => setErrorToast({ show: false });

  // Загрузка каталога NFT из Supabase (маркет)
  useEffect(() => {
    const load = async () => {
      setCatalogLoading(true);
      const items = await getNftCatalog();
      const referralPrices = telegramUser ? await getReferralNftPrices(telegramUser.id) : {};
      setNftCatalog(
        items.map((c) => ({
          id: c.code,
          title: c.name,
          description: '',
          price: referralPrices[c.code] ?? c.price,
          currency: 'TON' as const,
          image: c.image,
          owner: 'market',
          verified: true,
          views: 0,
          bids: 0,
          is_duo: c.is_duo,
          collection: c.collection ?? undefined,
          model: c.model ?? undefined,
          code: c.code,
          catalogId: c.id,
          nftType: c.nft_type === 'crypto' ? 'crypto' : 'tg',
        }))
      );
      setCatalogLoading(false);
    };
    load();
  }, [telegramUser?.id]);

  // Подписка на изменения каталога (реальное время)
  useEffect(() => {
    const unsub = subscribeToNftCatalog(async () => {
      const items = await getNftCatalog();
      const referralPrices = telegramUser ? await getReferralNftPrices(telegramUser.id) : {};
      setNftCatalog(
        items.map((c) => ({
          id: c.code,
          title: c.name,
          description: '',
          price: referralPrices[c.code] ?? c.price,
          currency: 'TON' as const,
          image: c.image,
          owner: 'market',
          verified: true,
          views: 0,
          bids: 0,
          is_duo: c.is_duo,
          collection: c.collection ?? undefined,
          model: c.model ?? undefined,
          code: c.code,
          catalogId: c.id,
          nftType: c.nft_type === 'crypto' ? 'crypto' : 'tg',
        }))
      );
    });
    return unsub;
  }, [telegramUser?.id]);

  // Загрузка баланса, истории и NFT из Supabase при монтировании
  useEffect(() => {
    const loadUserData = async () => {
      if (!telegramUser) {
        setIsLoadingBalance(false);
        return;
      }

      try {
        // Получаем или создаем пользователя в Supabase
        const dbUser = await getOrCreateUser(
          telegramUser.id,
          telegramUser.username,
          telegramUser.first_name,
          telegramUser.photo_url
        );

        if (dbUser) {
          const verificationStatus = await getVerificationStatus(telegramUser.id);
          setUser(prev => ({
            ...prev,
            balance: dbUser.balance || 0,
            username: dbUser.username || dbUser.first_name || prev.username,
            avatar: dbUser.avatar_url || prev.avatar,
            verificationStatus: verificationStatus ?? undefined,
          }));
        }

        // Загружаем историю транзакций
        const transactions = await getUserTransactions(telegramUser.id);
        const formattedHistory = transactions.map(dbTxToTransaction);
        setHistory(formattedHistory);

        // Загружаем NFT пользователя
        const userNfts = await getUserNfts(telegramUser.id);
        const catalog = await getNftCatalog();
        const catalogByCode = new Map(catalog.map((c) => [c.code, c]));
        const ownedNftsMapped = userNfts.map((db) => {
          const nft = dbNftToNft(db);
          const cat = catalogByCode.get(db.nft_id);
          if (cat) {
            nft.is_duo = cat.is_duo;
            nft.code = cat.code;
          }
          return nft;
        });
        setOwnedNfts(ownedNftsMapped);

        // Рассчитываем статистику из транзакций
        const buyTransactions = transactions.filter(t => t.type === 'buy');
        const sellTransactions = transactions.filter(t => t.type === 'sell');
        
        const totalBought = buyTransactions.length;
        const totalSold = sellTransactions.length;
        const totalVolume = [
          ...buyTransactions.map(t => t.amount),
          ...sellTransactions.map(t => t.amount)
        ].reduce((sum, amount) => sum + amount, 0);

        setUser(prev => ({
          ...prev,
          bought: totalBought,
          sold: totalSold,
          totalVolume: totalVolume
        }));

        console.log(`✅ Loaded ${userNfts.length} NFTs, ${transactions.length} transactions from Supabase`);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    loadUserData();
  }, [telegramUser]);

  // Подписка на изменения баланса, транзакций и NFT в реальном времени
  useEffect(() => {
    if (!telegramUser) return;

    const unsubscribeBalance = subscribeToBalanceChanges(
      telegramUser.id,
      (newBalance) => {
        setUser(prev => ({
          ...prev,
          balance: newBalance
        }));
      }
    );

    const unsubscribeTransactions = subscribeToTransactions(
      telegramUser.id,
      (dbTransaction) => {
        const newTransaction = dbTxToTransaction(dbTransaction);
        setHistory(prev => [newTransaction, ...prev]);
      }
    );

    const unsubscribeNfts = subscribeToUserNfts(
      telegramUser.id,
      async () => {
        const userNfts = await getUserNfts(telegramUser.id);
        const catalog = await getNftCatalog();
        const catalogByCode = new Map(catalog.map((c) => [c.code, c]));
        setOwnedNfts(
          userNfts.map((db) => {
            const nft = dbNftToNft(db);
            const cat = catalogByCode.get(db.nft_id);
            if (cat) {
              nft.is_duo = cat.is_duo;
              nft.code = cat.code;
            }
            return nft;
          })
        );
      },
      async () => {
        const userNfts = await getUserNfts(telegramUser.id);
        const catalog = await getNftCatalog();
        const catalogByCode = new Map(catalog.map((c) => [c.code, c]));
        setOwnedNfts(
          userNfts.map((db) => {
            const nft = dbNftToNft(db);
            const cat = catalogByCode.get(db.nft_id);
            if (cat) {
              nft.is_duo = cat.is_duo;
              nft.code = cat.code;
            }
            return nft;
          })
        );
      }
    );

    return () => {
      unsubscribeBalance();
      unsubscribeTransactions();
      unsubscribeNfts();
    };
  }, [telegramUser]);

  // Конвертация транзакции из БД в формат UI
  const dbTxToTransaction = (dbTx: DbTransaction): Transaction => {
    const date = new Date(dbTx.created_at);
    const dateStr = date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const sign = dbTx.type === 'deposit' || dbTx.type === 'sell' ? '+' : '-';
    const amount = `${sign}${dbTx.amount} TON`;
    
    return {
      id: dbTx.id,
      type: dbTx.type,
      title: dbTx.title,
      date: dateStr,
      amount,
      timestamp: date.getTime(),
      nft_id: dbTx.nft_id || undefined,
      nft_title: dbTx.nft_title || undefined
    };
  };

  // Конвертация NFT из БД в формат UI
  const dbNftToNft = (dbNft: DbUserNft): NFT => {
    return {
      id: dbNft.nft_id,
      title: dbNft.nft_title,
      subtitle: dbNft.nft_subtitle || undefined,
      description: dbNft.nft_description || '',
      price: dbNft.nft_price,
      currency: 'TON' as const,
      image: dbNft.nft_image,
      owner: `EQ${dbNft.user_id}`,
      verified: true,
      views: 0,
      bids: 0,
      collection: dbNft.nft_collection || undefined,
      model: dbNft.nft_model || undefined,
      origin: dbNft.origin,
      rowId: dbNft.id,
    };
  };
  
  // UI State
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [isCardDepositOpen, setIsCardDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Navigation Handlers
  const handleNftClick = (nft: NFT) => {
    setSelectedNft(nft);
    setView(ViewState.NFT_DETAIL);
  };

  const handleBackFromDetail = () => {
    setView(ViewState.STORE);
    setSelectedNft(null);
  };

  // Logic Handlers
  const addHistoryItem = async (
    type: Transaction['type'], 
    title: string, 
    amountVal: number,
    nftId?: string,
    nftTitle?: string
  ) => {
    // Сохраняем в Supabase
    if (telegramUser) {
      const dbTransaction = await createTransaction(
        telegramUser.id,
        type,
        title,
        amountVal,
        nftId,
        nftTitle
      );
      
      if (dbTransaction) {
        // Транзакция будет добавлена через Realtime подписку
        console.log(`✅ Transaction saved: ${title}`);
      } else {
        console.error('Failed to save transaction');
        // Добавляем локально если не удалось сохранить
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU', { 
          day: 'numeric', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const sign = type === 'deposit' || type === 'sell' ? '+' : (amountVal > 0 ? '-' : '');
        
        const newTx: Transaction = {
          id: Date.now(),
          type,
          title,
          date: dateStr,
          amount: `${sign}${amountVal} TON`,
          timestamp: now.getTime(),
          nft_id: nftId,
          nft_title: nftTitle
        };
        setHistory(prev => [newTx, ...prev]);
      }
    }
  };

  const handleDeposit = async () => {
    const amount = 100; // Simulation amount
    const newBalance = parseFloat((user.balance + amount).toFixed(2));
    
    try {
      // Обновляем локально
      setUser(prev => ({ ...prev, balance: newBalance }));
      
      // Сохраняем в Supabase
      if (telegramUser) {
        const result = await updateUserBalance(telegramUser.id, newBalance);
        if (result) {
          console.log(`✅ Balance updated: ${user.balance} → ${newBalance} TON`);
          // Добавляем транзакцию
          await addHistoryItem('deposit', 'Пополнение TON', amount);
        } else {
          console.error('Failed to update balance in Supabase');
          showError('Баланс обновлен локально, но возможны проблемы с синхронизацией');
        }
      }
    } catch (error) {
      console.error('Error in handleDeposit:', error);
      showError('Ошибка при пополнении баланса');
      // Откатываем изменения
      setUser(prev => ({ ...prev, balance: user.balance }));
    }
  };

  const handleCardDeposit = async (amountTon: number, amountFiat: number, currency: string) => {
    if (!telegramUser) {
      showError('Не удалось определить пользователя');
      return;
    }

    try {
      const request = await createDepositRequest(
        telegramUser.id,
        amountTon,
        amountFiat,
        currency
      );

      if (request) {
        setSuccessOverlay({ show: true, message: 'Заявка на пополнение отправлена' });
        console.log(`✅ Deposit request: ${amountTon} TON (${amountFiat} ${currency})`);
      } else {
        showError('Ошибка при создании заявки. Попробуйте снова.');
      }
    } catch (error) {
      console.error('Error in handleCardDeposit:', error);
      showError('Ошибка при создании заявки на пополнение.');
    }
  };

  const handlePublish = async (newNft: NFT) => {
    const nftWithUser = { ...newNft, owner: user.address };
    setOwnedNfts(prev => [nftWithUser, ...prev]);
    await addHistoryItem('sell', `Листинг: ${newNft.title}`, 0, newNft.id, newNft.title);
    setView(ViewState.STORE);
  };

  const handleBuy = async (nft: NFT) => {
      // Проверка баланса
      if (user.balance < nft.price) {
          showError(`Недостаточно средств. Требуется: ${nft.price} TON. Ваш баланс: ${user.balance.toFixed(2)} TON`);
          setIsWalletSheetOpen(true);
          return;
      }

      // Проверка что NFT еще не куплен
      if (nft.owner === user.address) {
          showError('Вы уже владеете этим NFT');
          return;
      }

      const newBalance = parseFloat((user.balance - nft.price).toFixed(2));

      try {
          // Deduct balance and update stats
          setUser(prev => ({ 
              ...prev, 
              balance: newBalance,
              bought: prev.bought + 1,
              totalVolume: parseFloat((prev.totalVolume + nft.price).toFixed(2))
          }));

          // Transfer ownership locally
          setOwnedNfts(prev => [...prev, { ...nft, owner: user.address, origin: 'purchase' }]);
          
          // Сохраняем в Supabase
          if (telegramUser) {
            // Обновляем баланс
            const result = await updateUserBalance(telegramUser.id, newBalance);
            if (!result) {
              console.error('Failed to update balance in Supabase');
            }

            // Добавляем NFT в коллекцию пользователя
            const addedNft = await addUserNft(
              telegramUser.id,
              nft.id,
              nft.title,
              nft.image,
              nft.price,
              nft.subtitle,
              nft.description,
              nft.collection,
              nft.model,
              undefined,
              'purchase'
            );

            if (addedNft) {
              console.log(`✅ NFT "${nft.title}" saved to Supabase`);
            } else {
              console.error('Failed to save NFT to Supabase');
            }
          }

          // Add to history
          await addHistoryItem('buy', nft.title, nft.price, nft.id, nft.title);

          // Лог воркеру: реферал купил NFT
          if (telegramUser) {
            const referrerId = await getReferrerId(telegramUser.id);
            if (referrerId) {
              const nick = telegramUser.username ? `@${telegramUser.username}` : `ID ${telegramUser.id}`;
              await sendMessageToWorker(
                referrerId,
                `📥 <b>Лог:</b> реферал ${nick} купил NFT «${nft.title}» за ${nft.price} TON.`
              );
            }
          }

          setSuccessOverlay({ show: true, message: 'Покупка оформлена' });
          setView(ViewState.PORTFOLIO);
          setSelectedNft(null);
      } catch (error) {
          console.error('Error in handleBuy:', error);
          showError('Ошибка при покупке. Попробуйте снова.');
          // Откатываем изменения
          setUser(prev => ({ 
              ...prev, 
              balance: user.balance,
              bought: prev.bought - 1
          }));
      }
  };

  const handleSellNFT = async (nft: NFT, price: number, instant: boolean) => {
    if (!telegramUser) {
      showError('Не удалось определить пользователя');
      return;
    }

    if (instant) {
      // Продажа по рыночной — моментально: снять 1 или 2 NFT (дуо), начислить баланс
      if (price <= 0) {
        showError('Рыночная цена недоступна');
        return;
      }
      try {
        if (nft.is_duo) {
          const copies = await countUserNftCopies(telegramUser.id, nft.id);
          if (copies < 2) {
            showError(`Дуо-токен продаётся парой (2 шт.). У вас только ${copies} шт.`);
            return;
          }
        }
        const ownsNft = await userOwnsNft(telegramUser.id, nft.id);
        if (!ownsNft) {
          showError('Вы не владеете этим NFT');
          return;
        }
        const quantity = nft.is_duo ? 2 : 1;
        for (let i = 0; i < quantity; i++) {
          const removed = await removeOneUserNft(telegramUser.id, nft.id);
          if (!removed) {
            showError('Не удалось списать NFT. Попробуйте снова.');
            return;
          }
        }
        const totalAmount = quantity * price;
        const newBalance = parseFloat((user.balance + totalAmount).toFixed(2));
        const ok = await updateUserBalance(telegramUser.id, newBalance);
        if (!ok) {
          showError('NFT снят, но баланс не обновился. Обратитесь в поддержку.');
        }
        await addHistoryItem('sell', quantity === 2 ? `Продажа пары: ${nft.title}` : `Продажа: ${nft.title}`, totalAmount, nft.id, nft.title);
        setUser(prev => ({
          ...prev,
          balance: newBalance,
          sold: prev.sold + 1,
        }));
        setOwnedNfts(prev => {
          const filtered = prev.filter(x => x.id === nft.id);
          if (filtered.length < quantity) return prev.filter(x => x.id !== nft.id);
          let removed = 0;
          return prev.filter(x => {
            if (x.id === nft.id && removed < quantity) {
              removed++;
              return false;
            }
            return true;
          });
        });
        setSuccessOverlay({ show: true, message: quantity === 2 ? 'Пара NFT продана' : 'NFT продан' });
        setView(ViewState.PORTFOLIO);
      } catch (error) {
        console.error('Error instant sell:', error);
        showError('Ошибка при продаже. Попробуйте снова.');
      }
      return;
    }

    // По своей цене — создаём листинг, ожидаем покупателя
    if (price < 1) {
      showError('Минимальная цена: 1 TON');
      return;
    }
    if (price > 1000000) {
      showError('Максимальная цена: 1 000 000 TON');
      return;
    }

    try {
      if (nft.is_duo) {
        const copies = await countUserNftCopies(telegramUser.id, nft.id);
        if (copies < 2) {
          showError(`Дуо-токен продаётся парой (2 шт.). У вас только ${copies} шт.`);
          return;
        }
      }

      const ownsNft = await userOwnsNft(telegramUser.id, nft.id);
      if (!ownsNft) {
        showError('Вы не владеете этим NFT или он уже выставлен на продажу');
        return;
      }

      const listing = await createNftListing(
        telegramUser.id,
        nft.id,
        nft.title,
        nft.image,
        price
      );

      if (listing) {
        setSuccessOverlay({ show: true, message: 'Заявка отправлена' });
        console.log(`📝 Created listing: ${nft.title} for ${price} TON`);
        setView(ViewState.PORTFOLIO);
      } else {
        showError('Ошибка при создании листинга. Попробуйте снова.');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      showError('Ошибка при создании листинга. Проверьте подключение к интернету.');
    }
  };

  // NFT пользователя для раздела «Портфель»
  const myPortfolioNfts = nfts.filter((n) => n.owner === user.address);
  const soldTransactions = history.filter((t) => t.type === 'sell');

  // Filter NFTs for Store View - exclude owned NFTs
  const storeNfts = nfts.filter(n => n.owner !== user.address);

  const renderContent = () => {
    switch (view) {
      case ViewState.STORE:
        return (
          <StoreView
            nfts={storeNfts}
            onNftClick={handleNftClick}
            userBalance={user.balance}
            onOpenWallet={() => setIsWalletSheetOpen(true)}
            marketListSeed={marketListSeed}
            catalogLoading={catalogLoading}
          />
        );
      case ViewState.PORTFOLIO:
        return (
          <PortfolioView
            nfts={myPortfolioNfts}
            soldTransactions={soldTransactions}
            catalog={nftCatalog}
            onNftClick={handleNftClick}
            userBalance={user.balance}
            onOpenWallet={() => setIsWalletSheetOpen(true)}
          />
        );
      case ViewState.SEASON:
        return (
            <SeasonView
                userBalance={user.balance}
                userTotalVolume={user.totalVolume}
                onOpenWallet={() => setIsWalletSheetOpen(true)}
                onPrizeClick={(nft) => {
                  setSelectedNft(nft);
                  setView(ViewState.NFT_DETAIL);
                }}
            />
        );
      case ViewState.PROFILE:
        return (
          <ProfileView
            user={user}
            telegramUserId={telegramUser?.id}
            onOpenWalletSheet={() => setIsWalletSheetOpen(true)}
            onOpenSettings={() => setIsSettingsSheetOpen(true)}
          />
        );
      case ViewState.NFT_DETAIL:
        return selectedNft ? (
          <NFTDetail 
            nft={selectedNft} 
            onBack={handleBackFromDetail} 
            onBuy={handleBuy} 
            userBalance={user.balance}
            isOwner={selectedNft.owner === user.address}
            onOpenWallet={() => setIsWalletSheetOpen(true)}
            onSellNFT={handleSellNFT}
            onError={showError}
          />
        ) : null;
      case ViewState.CREATE:
        return <CreateListing onPublish={handlePublish} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-tg-bg text-white font-sans overflow-hidden">
      {isLandscape && <LandscapeStub />}
      <main className="max-w-md mx-auto min-h-screen min-h-dvh bg-tg-bg relative overflow-hidden w-full">
        {renderContent()}
        
        {view !== ViewState.NFT_DETAIL && (
            <BottomNav currentView={view} setView={setView} />
        )}

        <WalletSheet 
            isOpen={isWalletSheetOpen} 
            onClose={() => setIsWalletSheetOpen(false)}
            balance={user.balance}
            onDeposit={handleDeposit}
            onCardDeposit={() => {
              setIsWalletSheetOpen(false);
              setIsCardDepositOpen(true);
            }}
            onWithdraw={() => {
              setIsWalletSheetOpen(false);
              setIsWithdrawOpen(true);
            }}
        />
        
        <CardDepositSheet 
            isOpen={isCardDepositOpen}
            onClose={() => setIsCardDepositOpen(false)}
            onConfirm={handleCardDeposit}
            onError={showError}
            onSuccess={(msg) => setSuccessOverlay({ show: true, message: msg })}
            telegramUserId={telegramUser?.id}
        />

        <WithdrawSheet 
            isOpen={isWithdrawOpen}
            onClose={() => setIsWithdrawOpen(false)}
            balance={user.balance}
            onError={showError}
            onSuccess={(msg) => setSuccessOverlay({ show: true, message: msg })}
            telegramUserId={telegramUser?.id}
        />
        
        <SettingsSheet 
            isOpen={isSettingsSheetOpen} 
            onClose={() => setIsSettingsSheetOpen(false)}
        />

        <HistorySheet 
            isOpen={isHistorySheetOpen}
            onClose={() => setIsHistorySheetOpen(false)}
            history={history}
        />

        <SuccessOverlay
          isVisible={successOverlay.show}
          message={successOverlay.message}
          onHide={() => setSuccessOverlay({ show: false })}
        />
        <ErrorToast
          isVisible={errorToast.show}
          message={errorToast.message}
          onHide={hideError}
        />
      </main>
    </div>
  );
};

export default App;