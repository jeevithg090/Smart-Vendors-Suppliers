/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_SARVAM_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_GOOGLE_TRANSLATE_API_KEY?: string;
  readonly VITE_VISION_API_KEY?: string;
  readonly VITE_CLARIFAI_API_KEY?: string;
  readonly VITE_AZURE_VISION_API_KEY?: string;
  readonly VITE_AZURE_VISION_ENDPOINT?: string;
  readonly VITE_TTS_API_KEY?: string;
  readonly VITE_BUILD_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
