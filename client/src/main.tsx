import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { NotificationProvider } from './lib/notifications.tsx'
import { RemindersProvider } from './lib/reminders.tsx'
import { WatchlistProvider } from './lib/watchlist.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WatchlistProvider>
          <RemindersProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </RemindersProvider>
        </WatchlistProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
