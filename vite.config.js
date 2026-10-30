import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load env variables without exposing them to client code
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/notion-api': {
          target: 'https://api.notion.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/notion-api/, ''),
          headers: {
            'Authorization': `Bearer ${env.NOTION_API_KEY || env.VITE_NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
          },
        },
      },
    },
  };
});