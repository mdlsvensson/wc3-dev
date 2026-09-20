import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { jass } from './src/syntax/jass';

export default defineConfig({
  site: 'https://wc3.dev',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { langs: [jass], themes: { light: 'github-light', dark: 'github-dark' } } },
  integrations: [starlight({
    title: 'wc3.dev / framework',
    description: 'TypeScript gameplay, Pkl object data, and Deno tooling for Warcraft III.',
    favicon: '/brand/wc3-crest.png',
    logo: { src: './public/brand/wc3-crest.png', alt: '', replacesTitle: false },
    customCss: ['./src/styles/docs.css'],
    components: {
      ThemeProvider: './src/components/docs/ThemeProvider.astro',
      ThemeSelect: './src/components/docs/ThemeSelect.astro',
    },
    expressiveCode: { shiki: { langs: [jass] }, themes: ['github-dark'] },
    sidebar: [
      { label: 'Back to wc3.dev', link: '/' },
      { label: 'Framework overview', link: '/framework/' },
      { label: 'Start here', items: [
        { label: 'Introduction', slug: 'framework/docs' },
        { label: 'Installation', slug: 'framework/docs/installation' },
        { label: 'Use your own map', slug: 'framework/docs/custom-maps' },
        { label: 'Make your first map', slug: 'framework/docs/map-making' },
      ] },
      { label: 'Reference', items: [
        { label: 'Pkl object data', slug: 'framework/docs/object-data' },
        { label: 'Architecture', slug: 'framework/docs/architecture' },
        { label: 'Commands & configuration', slug: 'framework/docs/reference' },
        { label: 'Troubleshooting', slug: 'framework/docs/troubleshooting' },
      ] },
    ],
  })],
});
