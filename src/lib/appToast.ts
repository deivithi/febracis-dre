/** CustomEvent para o sistema de toast (desacoplado de hooks de dados). */
export const APP_TOAST_EVENT = 'febracis-dre:app-toast';

export type AppToastDetail = {
  title: string;
  variant?: 'success';
};

export function showAppToast(detail: AppToastDetail): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail }));
}
