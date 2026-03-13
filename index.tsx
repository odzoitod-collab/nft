import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Preloader from './components/Preloader';
import { initTelegram, getTelegramUser } from './services/telegramWebApp';

const PRELOADER_FADE_MS = 300;
const PRELOADER_UNMOUNT_MS = 500;

// Инициализация TG Mini App: ready, expand, цвета, вертикальные свайпы
initTelegram();
const telegramUser = getTelegramUser();

function Root() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [preloaderHiding, setPreloaderHiding] = useState(false);

  useEffect(() => {
    const onLoad = () => {
      setPreloaderHiding(true);
      setTimeout(() => setShowPreloader(false), PRELOADER_FADE_MS + PRELOADER_UNMOUNT_MS);
    };
    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return (
    <>
      {showPreloader && <Preloader visible={showPreloader} hiding={preloaderHiding} />}
      <App telegramUser={telegramUser} />
    </>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);