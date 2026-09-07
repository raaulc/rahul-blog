import { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { NAV, type View } from './nav';
import Home from './screens/Home';
import See from './screens/See';
import Choose from './screens/Choose';
import Play from './screens/Play';
import Learn from './screens/Learn';
import Adjust from './screens/Adjust';

function ThemeToggle() {
  const { data, actions } = useStore();
  const cycle = () => {
    const t = data.settings.theme;
    actions.setTheme(t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light');
  };
  const label =
    data.settings.theme === 'light'
      ? 'Light'
      : data.settings.theme === 'dark'
        ? 'Dark'
        : 'System';
  return (
    <button
      className="rounded-md px-2 py-1 text-[12px] text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      onClick={cycle}
      title="Toggle theme"
    >
      {label}
    </button>
  );
}

function Shell() {
  const [view, setView] = useState<View>('home');

  return (
    <>
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pb-24 pt-5 sm:pb-10">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">Career Game</span>
            <span className="hidden text-[11px] text-neutral-400 sm:inline">
              SEE · CHOOSE · PLAY · ADJUST
            </span>
          </div>
          <ThemeToggle />
        </header>

        <nav className="mb-5 hidden flex-wrap gap-1 sm:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                view === n.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <main className="flex-1">
          {view === 'home' && <Home go={setView} />}
          {view === 'see' && <See />}
          {view === 'choose' && <Choose />}
          {view === 'play' && <Play />}
          {view === 'learn' && <Learn />}
          {view === 'adjust' && <Adjust />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 sm:hidden">
        <div
          className="mx-auto grid max-w-xl"
          style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
        >
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`py-2.5 text-[12px] ${
                view === n.id
                  ? 'font-medium text-indigo-600 dark:text-indigo-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
