import { NFT, User } from './types';

/** Три коллекции маркета */
export const COLLECTIONS = ['Ethos Classics', 'Neon Drop', 'Genesis'] as const;
export const MODELS = ['Rare', 'Epic', 'Legendary'] as const;
export const BACKDROPS = ['Студия', 'Космос', 'Город'] as const;

export const MOCK_USER: User = {
  address: 'EQA...User',
  balance: 124.5,
  username: 'Nka_arm',
  avatar: 'https://picsum.photos/200/200?random=user',
  totalVolume: 1540,
  bought: 12,
  sold: 45,
};

const IMAGES = [
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
  '/images/4.jpg',
  '/images/5.jpg',
  '/images/6.jpg',
  '/images/7.jpg',
  '/images/8.jpg',
  '/images/9.jpg',
  '/images/10.jpg',
  '/images/11.jpg',
  '/images/12.jpg',
  '/images/13.jpg',
  '/images/14.jpg',
  '/images/15.jpg',
  '/images/16.jpg',
  '/images/17.jpg',
  '/images/18.jpg',
  '/images/19.jpg',
  '/images/20.jpg',
  '/images/21.jpg',
  '/images/22.jpeg',
  '/images/23.gif',
  '/images/24.gif',
  '/images/26.png',
  '/images/27.jpg',
  '/images/28.jpeg',
  '/images/29.jpg',
  '/images/30.jpeg',
  '/images/31.png',
  '/images/32.png',
  '/images/33.png',
  '/images/34.png',
  '/images/35.png',
  '/images/36.png',
  '/images/37.png',
  '/images/38.png',
  '/images/39.png',
  '/images/40.png',
];

function nft(
  id: string,
  title: string,
  subtitle: string,
  price: number,
  image: string,
  collection: (typeof COLLECTIONS)[number],
  model: (typeof MODELS)[number],
  backdrop: (typeof BACKDROPS)[number],
  owner = 'EQX...' + id
): NFT {
  return {
    id,
    title,
    subtitle,
    description: `${title} из коллекции ${collection}.`,
    price,
    currency: 'TON',
    image,
    owner,
    verified: true,
    views: 100 + Math.floor(Math.random() * 500),
    bids: Math.floor(Math.random() * 20),
    collection,
    model,
    backdrop,
  };
}

const COLLS = ['Ethos Classics', 'Neon Drop', 'Genesis'] as const;
const MODS: (typeof MODELS)[number][] = ['Rare', 'Epic', 'Legendary'];
const BACKS: (typeof BACKDROPS)[number][] = ['Студия', 'Космос', 'Город'];

export const MOCK_NFTS: NFT[] = IMAGES.map((image, index) => {
  const num = index + 1;
  const id = String(num);
  const sub = `#${String(num).padStart(3, '0')}`;
  const coll = COLLS[index % COLLS.length];
  const model = MODS[index % MODS.length];
  const backdrop = BACKS[index % BACKS.length];
  const price = 4 + (index % 20) * 0.5 + Math.floor(index / 10);
  return nft(id, `Ethos #${sub}`, sub, Math.round(price * 10) / 10, image, coll, model, backdrop);
});
