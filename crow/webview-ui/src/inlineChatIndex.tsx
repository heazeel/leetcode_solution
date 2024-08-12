import React from 'react';
import ReactDOM from 'react-dom/client';
import initArms from './utilities/initArms.ts';
import AppInlineChat from './AppInlineChat.tsx';
import './index.css';

initArms();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppInlineChat />
  </React.StrictMode>,
);
