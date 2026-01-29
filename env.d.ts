interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY: string;
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Support for process.env (if used in specific bundler setups)
declare namespace NodeJS {
  interface ProcessEnv {
    readonly VITE_TMDB_API_KEY: string;
    readonly VITE_APPWRITE_ENDPOINT: string;
    readonly VITE_APPWRITE_PROJECT_ID: string;
    readonly REACT_APP_TMDB_API_KEY?: string;
    readonly REACT_APP_APPWRITE_ENDPOINT?: string;
    readonly REACT_APP_APPWRITE_PROJECT_ID?: string;
  }
}
