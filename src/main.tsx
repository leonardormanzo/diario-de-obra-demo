import {createRoot} from 'react-dom/client';
import Root from './Root.tsx';
import './index.css';
import { initPhotoStore } from './services/photoStore';

// Photos live in IndexedDB; load them before the first render so every screen can show them.
initPhotoStore().finally(() => {
  createRoot(document.getElementById('root')!).render(<Root />);
});

// Offline support + installable app (production only, so the dev server is not cached).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error) => console.error('Não foi possível ativar o modo offline:', error));
  });
}
