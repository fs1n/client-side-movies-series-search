import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Validates that all required environment variables are present
 * Fails the build immediately if any are missing
 */
function validateEnv(env: Record<string, string>) {
  const requiredVars = [
    'VITE_TMDB_API_KEY',
    'VITE_APPWRITE_ENDPOINT',
    'VITE_APPWRITE_PROJECT_ID',
  ];

  const missing = requiredVars.filter(key => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `\nMissing required environment variables: ${missing.join(', ')}\n` +
      `\nPlease create a .env file in the project root with the following variables:\n` +
      `   VITE_TMDB_API_KEY=your_tmdb_api_key\n` +
      `   VITE_APPWRITE_ENDPOINT=your_appwrite_endpoint\n` +
      `   VITE_APPWRITE_PROJECT_ID=your_project_id\n` +
      `\nYou can use .env.example as a template.\n`
    );
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  validateEnv(env);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
