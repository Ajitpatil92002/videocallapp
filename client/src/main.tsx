import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { SocketProvider } from './context/socket-provider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <SocketProvider>
            <App />
        </SocketProvider>
    </BrowserRouter>
);
