import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { VueMcp } from 'vite-plugin-vue-mcp'
import type { Plugin } from 'vite'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

function copyExtensionLocales(): Plugin {
  const sourceDir = resolve(__dirname, 'src/i18n/locales')
  const outputDir = resolve(__dirname, 'dist/_locales')

  async function copy(): Promise<void> {
    await fs.rm(outputDir, { recursive: true, force: true })
    await fs.mkdir(outputDir, { recursive: true })

    const entries = await fs.readdir(sourceDir, { withFileTypes: true })
    await Promise.all(entries.map(async entry => {
      if (!entry.isDirectory()) return
      await fs.cp(join(sourceDir, entry.name), join(outputDir, entry.name), { recursive: true })
    }))
  }

  return {
    name: 'copy-extension-locales',
    apply: 'build',
    async writeBundle() {
      await copy()
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), VueMcp(), copyExtensionLocales()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
