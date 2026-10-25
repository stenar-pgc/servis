import { defineConfig } from '#q-app'

export default defineConfig(() => ({
  boot: ['i18n'],
  css: ['app.scss'],
  extras: ['roboto-font-latin-ext', 'material-icons'],
  build: {
    vueRouterMode: 'history',
    publicPath: '/',
    target: { browser: ['es2022', 'safari16'], node: 'node22' }
  },
  devServer: { host: '0.0.0.0', port: 3000, strictPort: true, open: false, watch: { usePolling: true } },
  framework: { plugins: ['Notify', 'Dialog'], lang: 'sl' }
}))
