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
  description: 'Moonwell docs, a multilingual modding framework for Warcraft III: Reforged.',
  cleanUrls: true,
  // Files in public/ are copied as they are; without this the fonts' README.md would also become a page.
  srcExclude: ['public/**'],
  appearance: 'force-dark',
  head: [['link', { rel: 'icon', type: 'image/png', href: '/mw-moonwell.png' }]],
  themeConfig: {
    logo: { src: '/mw-text-edit.png', alt: 'Moonwell' },
    siteTitle: false,
    nav: [
      { text: 'docs', link: '/moonwell/', activeMatch: '^/moonwell/' },
      { text: 'wrappers', link: '/wrappers/', activeMatch: '^/wrappers/' },
      { text: 'systems', link: '/systems/', activeMatch: '^/systems/' },
    ],
    sidebar: {
      '/moonwell/': section('moonwell', '/moonwell/'),
      '/wrappers/': section('moonwell-wrappers', '/wrappers/'),
      '/systems/': section('moonwell-systems', '/systems/'),
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/mdlsvensson/moonwell' }],
  },
})
