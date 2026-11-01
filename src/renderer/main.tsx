import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { About } from './About';
import { Settings } from './Settings';
import './styles.css';

const isSettings = new URLSearchParams(window.location.search).get('page') === 'settings';
document.title = isSettings ? 'Ajustes de Dōgara' : 'Acerca de Dōgara';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSettings ? <Settings /> : <About />}</StrictMode>,
);
