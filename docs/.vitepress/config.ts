import { defineConfig } from 'vitepress'

function section(name: string, base: string) {
  return [
    {
      text: name,
      items: [
        { text: 'Overview', link: base },
        { text: 'Getting started', link: `${base}getting-started` },
      ],
    },
  ]
}

export default defineConfig({
  lang: 'en-US',
  title: 'wc3.dev',
  description: 'Documentation for Moonwell and its libraries, for making Warcraft III maps.',
  cleanUrls: true,
  head: [['link', { rel: 'icon', type: 'image/png', href: '/mw-moonwell.png' }]],
  themeConfig: {
    logo: { src: '/mw-moonwell.png', alt: '' },
    nav: [
      { text: 'Moonwell', link: '/moonwell/', activeMatch: '^/moonwell/' },
      { text: 'Wrappers', link: '/wrappers/', activeMatch: '^/wrappers/' },
      { text: 'Systems', link: '/systems/', activeMatch: '^/systems/' },
    ],
    sidebar: {
      '/moonwell/': section('Moonwell', '/moonwell/'),
      '/wrappers/': section('Wrappers', '/wrappers/'),
      '/systems/': section('Systems', '/systems/'),
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/mdlsvensson/moonwell' }],
  },
})
