/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** `production` | `demo` | `development` — controla banner e cópias de apresentação no build. */
  readonly VITE_APP_MODE?: string;
  /** `1` ou `true` — U14 sugestões inline por campo (Popover por linha editável). */
  readonly VITE_INLINE_ASSISTANT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
