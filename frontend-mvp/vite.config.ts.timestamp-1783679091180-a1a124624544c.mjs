// vite.config.ts
import { defineConfig } from "file:///Users/richelleshi/workspace/portal/frontend-mvp/node_modules/.pnpm/vite@5.4.21_@types+node@26.0.0/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/richelleshi/workspace/portal/frontend-mvp/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vite@5.4.21_@types+node@26.0.0__vue@3.5.38_typescript@5.9.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "node:path";
import { codeInspectorPlugin } from "file:///Users/richelleshi/workspace/portal/frontend-mvp/node_modules/.pnpm/code-inspector-plugin@1.6.3/node_modules/code-inspector-plugin/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/richelleshi/workspace/portal/frontend-mvp";
var vite_config_default = defineConfig({
  base: "/PORTL/",
  plugins: [
    vue(),
    codeInspectorPlugin({ bundler: "vite" })
  ],
  resolve: {
    alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") }
  },
  server: {
    port: 5176
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcmljaGVsbGVzaGkvd29ya3NwYWNlL3BvcnRhbC9mcm9udGVuZC1tdnBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9yaWNoZWxsZXNoaS93b3Jrc3BhY2UvcG9ydGFsL2Zyb250ZW5kLW12cC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvcmljaGVsbGVzaGkvd29ya3NwYWNlL3BvcnRhbC9mcm9udGVuZC1tdnAvdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBjb2RlSW5zcGVjdG9yUGx1Z2luIH0gZnJvbSAnY29kZS1pbnNwZWN0b3ItcGx1Z2luJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBiYXNlOiAnL1BPUlRMLycsXG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBjb2RlSW5zcGVjdG9yUGx1Z2luKHsgYnVuZGxlcjogJ3ZpdGUnIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHsgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTc2LFxuICB9LFxuICB0ZXN0OiB7XG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBzZXR1cEZpbGVzOiBbJy4vc3JjL19fdGVzdHNfXy9zZXR1cC50cyddLFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsMkJBQTJCO0FBSnBDLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLG9CQUFvQixFQUFFLFNBQVMsT0FBTyxDQUFDO0FBQUEsRUFDekM7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU8sRUFBRSxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPLEVBQUU7QUFBQSxFQUNqRDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFNBQVM7QUFBQSxJQUNULFlBQVksQ0FBQywwQkFBMEI7QUFBQSxFQUN6QztBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
