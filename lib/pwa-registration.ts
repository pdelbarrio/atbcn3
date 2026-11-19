export function shouldRegisterServiceWorker(): boolean {
  return process.env.NODE_ENV === 'production';
}
