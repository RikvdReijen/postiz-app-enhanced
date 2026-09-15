import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@postpls/app';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
