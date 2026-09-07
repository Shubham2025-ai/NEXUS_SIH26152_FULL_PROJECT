import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PrismaHero } from './components/ui/prisma-hero';
import './styles.css';
import './post-explorer.css';

function RootRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/dashboard' || window.location.hash === '#/dashboard') {
      return '/dashboard';
    }
    return path;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/dashboard' || window.location.hash === '#/dashboard') {
        setCurrentPath('/dashboard');
      } else {
        setCurrentPath(path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isDashboard = currentPath === '/dashboard' || currentPath.startsWith('/dashboard') || window.location.hash === '#/dashboard';

  if (isDashboard) {
    return (
      <div className="dashboard-container">
        <App onNavigateHome={() => navigate('/')} />
      </div>
    );
  }

  // Default: PrismaHero Landing Page
  return (
    <main className="landing-wrapper">
      <PrismaHero onNavigateDashboard={() => navigate('/dashboard')} />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>,
);
