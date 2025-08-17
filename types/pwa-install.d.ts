declare namespace JSX {
  interface IntrinsicElements {
    'pwa-install': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      'app-name'?: string;
      'app-icon'?: string;
      'app-description'?: string;
      'install-button-text'?: string;
      'close-button-text'?: string;
      'install-description-text'?: string;
    }, HTMLElement>;
  }
}