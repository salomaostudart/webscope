/**
 * Confirm dialog helper — replaces native confirm().
 * The ConfirmDialog component must be included in the layout.
 */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(false); return; }

    const overlay = document.getElementById('confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok') as HTMLButtonElement | null;
    const cancelBtn = document.getElementById('confirm-cancel') as HTMLButtonElement | null;

    if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn) {
      // Fallback to native if component missing
      resolve(window.confirm(opts.message));
      return;
    }

    titleEl.textContent = opts.title;
    messageEl.textContent = opts.message;
    okBtn.textContent = opts.confirmText || 'Confirm';
    cancelBtn.textContent = opts.cancelText || 'Cancel';

    okBtn.classList.toggle('confirm-danger', !!opts.danger);

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    const cleanup = (result: boolean): void => {
      overlay.hidden = true;
      document.body.style.overflow = '';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onOk = (): void => cleanup(true);
    const onCancel = (): void => cleanup(false);
    const onOverlayClick = (e: MouseEvent): void => {
      if (e.target === overlay) cleanup(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKey);

    cancelBtn.focus();
  });
}
