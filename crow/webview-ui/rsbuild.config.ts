import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginLightningcss } from '@rsbuild/plugin-lightningcss';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [pluginReact(), pluginLightningcss()],
  source: {
    alias: {
      '@': `${__dirname}/src`,
    },
    entry: {
      crowChat: './src/index.tsx',
      inlineChat: './src/inlineChatIndex.tsx',
    },
  },
  output: {
    polyfill: 'off',
    legalComments: 'none',
    filenameHash: false,
    manifest: true,
    distPath: {
      // js: 'assets',
      // jsAsync: 'async',
      // css: 'assets',
      // cssAsync: 'cssAsync',
      // svg: 'assets',
      // image: 'assets',
    },
    filename: {
      // js: '[name].js',
      // css: '[name].css',
      // svg: '[name].[ext]',
      // image: '[name].[ext]',
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'single-vendor',
    },
    printFileSize: {
      detail: false,
    },
  },
});
