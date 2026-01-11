import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';

// Custom plugin to inject script tag - uses different paths for dev vs build
function injectBundleScript(): Plugin {
  let isDev = false;
  
  return {
    name: 'inject-bundle-script',
    configResolved(config) {
      isDev = config.command === 'serve';
    },
    transformIndexHtml(html, ctx) {
      // Only transform config.html
      if (!ctx.filename.includes('config.html')) return html;
      
      // Use TypeScript source in dev, bundled JS in production
      const scriptSrc = isDev 
        ? './src/config/index.ts' 
        : './js/config-bundle.js';
      
      // Add the bundle script before closing body tag
      return html.replace(
        '</body>',
        `  <script type="module" src="${scriptSrc}"></script>\n</body>`
      );
    }
  };
}

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow connections from any host
    cors: true,
    headers: {
      // Allow embedding in Tableau's WebView
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *"
    }
  },
  plugins: [injectBundleScript()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        // Display panel (shows saved visualizations)
        index: resolve(__dirname, 'index.html'),
        // Config dialog (chat UI, AI interaction) - main functionality
        config: resolve(__dirname, 'config.html'),
        // Config TypeScript modules bundle
        'js/config-bundle': resolve(__dirname, 'src/config/index.ts')
      },
      output: {
        // Ensure consistent naming for bundles
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'js/config-bundle') {
            return 'js/config-bundle.js';
          }
          return '[name]-[hash].js';
        },
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  // Ensure proper module resolution
  resolve: {
    alias: {
      '@config': resolve(__dirname, 'src/config')
    }
  },
  optimizeDeps: {
    exclude: []
  }
});
