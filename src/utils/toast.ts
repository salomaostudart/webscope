/**
 * Toast helper — show a notification.
 * The Toast component must be included in the layout.
 */

import { escapeHtml } from './sanitize';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '!',
};

export function showToast(message: string, type: ToastType = 'info', durationMs = 4000): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${ICONS[type]}</span>
    <div class="toast-body">${escapeHtml(message)}</div>
    <button class="toast-close" type="button" aria-label="Dismiss">×</button>
  `;
  container.appendChild(toast);

  const remove = (): void => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close')?.addEventListener('click', remove);
  if (durationMs > 0) setTimeout(remove, durationMs);
}
