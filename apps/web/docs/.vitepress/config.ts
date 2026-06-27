import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SMPP SMS Gateway',
  description: 'Documentation for Rumsan SMPP SMS Gateway',
  base: '/docs/',
  outDir: '../public/docs',
  ignoreDeadLinks: [/^http:\/\/localhost/],
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/overview' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Setup', link: '/guide/setup' },
          { text: 'GoIP Configuration', link: '/guide/goip' },
          { text: 'Channels & Permissions', link: '/guide/channels' },
          { text: 'Sending Messages', link: '/guide/messages' },
          { text: 'Notifications', link: '/guide/notifications' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker (SMPP Gateway)', link: '/deployment/docker' },
          { text: 'Cloudflare Workers (API)', link: '/deployment/cloudflare' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/overview' },
          { text: 'Authentication', link: '/api/auth' },
          { text: 'Channels', link: '/api/channels' },
          { text: 'Conversations & Messages', link: '/api/messages' },
          { text: 'Admin', link: '/api/admin' },
          { text: 'Internal (SMPP)', link: '/api/internal' },
        ],
      },
    ],
  },
})
