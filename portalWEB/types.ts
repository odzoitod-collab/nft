export interface NFT {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  currency: 'TON' | 'USDT';
  image: string;
  owner: string;
  verified?: boolean;
  views: number;
  bids: number;
  collection?: string;
  model?: string;
  /** ID в каталоге Supabase (nft_catalog.id) — для поиска и отображения */
  catalogId?: number;
  origin?: 'gift' | 'purchase';
  /** Для продажи нужна пара (2 таких NFT) */
  is_duo?: boolean;
  /** Внутренний id строки в user_nfts (для уникального key при нескольких копиях) */
  rowId?: number;
  /** Код NFT в каталоге (из БД) */
  code?: string;
  /** Категория для маркета: TG NFT или Crypto NFT */
  nftType?: 'tg' | 'crypto';
}

export enum ViewState {
  STORE = 'STORE',
  PORTFOLIO = 'PORTFOLIO',
  SEASON = 'SEASON',
  PROFILE = 'PROFILE',
  NFT_DETAIL = 'NFT_DETAIL',
  CREATE = 'CREATE'
}

export interface User {
  address: string;
  balance: number;
  username: string;
  avatar: string;
  totalVolume: number;
  bought: number;
  sold: number;
  /** Статус верификации: актив / пассив / нет */
  verificationStatus?: 'active' | 'passive' | null;
}

export interface Transaction {
  id: number;
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  title: string;
  date: string;
  amount: string;
  timestamp: number;
  nft_id?: string;
  nft_title?: string;
}