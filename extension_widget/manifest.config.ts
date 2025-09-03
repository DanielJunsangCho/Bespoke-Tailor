import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Bespoke Resume BETA',
  description: 'Automatically tailor your resume for job applications using AI - THIS EXTENSION IS FOR BETA TESTING',
  version: pkg.version,
  icons: {
    16: 'public/16-logo.png',
    48: 'public/48-logo.png',
    128: 'public/128-logo.png',
  },
  action: {
    default_icon: {
      16: 'public/16-logo.png',
      48: 'public/48-logo.png',
      128: 'public/128-logo.png',
    },
    default_title: 'Bespoke Resume'
  },
  background: {
    service_worker: 'src/background.ts'
  },
  permissions: [
    'activeTab',
    'storage',
    'identity',
    'scripting',
    'downloads',
  ],
  host_permissions: [
    'https://*/*',
    'http://*/*',
  ],
  content_scripts: [{
    js: ['src/content/main.tsx'],
    matches: ['https://*/*', 'http://*/*'],
    run_at: 'document_idle'
  }],
  // oauth2: {
  //   client_id: '866896908660-gvkujh75pqtct9o12ra8obg234o21dof.apps.googleusercontent.com',
  //   scopes: [
  //     'https://www.googleapis.com/auth/documents',
  //     'https://www.googleapis.com/auth/drive.file'
  //   ]
  // },
  web_accessible_resources: [{
    resources: ['src/pages/history.html', 'assets/*', 'public/*.png'],
    matches: ['<all_urls>']
  }]
})
