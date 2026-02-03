import { defineConfig } from 'vite'

export default defineConfig({
    // Base path for GitHub Pages deployment
    base: '/carte_a_gratter/',
    server: {
        host: true
    },
    build: {
        outDir: 'dist',
    }
})
