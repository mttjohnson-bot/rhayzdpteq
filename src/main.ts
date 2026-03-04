import { Game } from './game/Game';

function showErrorOverlay(message: string): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.85)',
    'color:#ff4444',
    'font:16px/1.5 monospace',
    'padding:2rem',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'z-index:9999',
    'white-space:pre-wrap',
    'text-align:center',
  ].join(';');
  overlay.textContent = `A fatal error occurred:\n\n${message}\n\nPlease refresh the page.`;
  document.body.appendChild(overlay);
}

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
  console.error('Unhandled promise rejection:', event.reason);
  showErrorOverlay(message);
});

try {
  const game = new Game();
  game.start();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Fatal error starting game:', err);
  showErrorOverlay(message);
}
