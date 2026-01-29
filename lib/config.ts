/**
 * Helper to get environment variables with support for Vite and standard process.env
 * Throws an error if the variable is not found (no fallback values for security)
 */
const getEnvVar = (key: string): string => {
  let value: string | undefined;

  // Try import.meta.env (Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  // Try process.env (Node / Webpack)
  if (!value && typeof process !== 'undefined' && process.env) {
    value = process.env[key];
  }

  if (!value) {
    const errorMessage = `Missing required environment variable: ${key}\n\nPlease create a .env file in the project root with the required variables.\nYou can copy .env.example as a template.`;
    throw new Error(errorMessage);
  }

  return value;
};

// Validate and export config - will throw error during build if env vars are missing
export const config = {
  tmdb: {
    apiKey: getEnvVar('VITE_TMDB_API_KEY'),
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
    backdropBaseUrl: 'https://image.tmdb.org/t/p/original',
  },
  appwrite: {
    endpoint: getEnvVar('VITE_APPWRITE_ENDPOINT'),
    projectId: getEnvVar('VITE_APPWRITE_PROJECT_ID'),
  }
} as const;