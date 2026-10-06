import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vitepress'

const docs = 'https://docs.wc3.dev'

// A link to the docs site that opens in the same tab, without the external-link icon.
function toDocs(text: string, path: string) {
  return { text, link: `${docs}${path}`, target: '_self', noIcon: true }
}

export default defineConfig({
  lang: 'en-US',
  title: 'wc3.dev',
  description: 'Moonwell, a multilingual modding framework for Warcraft III: Reforged.',
  cleanUrls: true,
  appearance: 'force-dark',
  head: [['link', { rel: 'icon', type: 'image/png', href: '/mw-moonwell.png' }]],
  // The images and fonts are the docs': one copy for both sites.
  vite: { publicDir: '../docs/public' },
  themeConfig: {
    logo: { src: '/mw-text-edit.png', alt: 'Moonwell' },
    siteTitle: false,
    nav: [toDocs('docs', '/moonwell/'), toDocs('wrappers', '/wrappers/'), toDocs('systems', '/systems/')],
    socialLinks: [{ icon: 'github', link: 'https://github.com/mdlsvensson/moonwell' }],
  },
  // The docs were at wc3.dev before they moved to docs.wc3.dev: their old addresses redirect.
  buildEnd(site) {
    const rules = ['moonwell', 'wrappers', 'systems'].flatMap((section) => [
      `/${section} ${docs}/${section}/ 301`,
      `/${section}/* ${docs}/${section}/:splat 301`,
    ])
    writeFileSync(join(site.outDir, '_redirects'), rules.join('\n') + '\n')
  },
})
