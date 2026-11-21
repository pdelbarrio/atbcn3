import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "pwa-install": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "app-name"?: string;
        "app-icon"?: string;
        "app-description"?: string;
        "install-button-text"?: string;
        "close-button-text"?: string;
        "install-description-text"?: string;
      };
    }
  }
}
