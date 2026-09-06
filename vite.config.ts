import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base 设为仓库名，GitHub Pages 部署在 https://<user>.github.io/gradedetect/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/gradedetect/',
})

