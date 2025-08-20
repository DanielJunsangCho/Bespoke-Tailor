import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Bespoke Resume',
  description: 'Automatically tailor your resume for job applications using AI',
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
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
    'scripting'
  ],
  host_permissions: [
    'https://*/*',
    'http://*/*',
    'https://docs.google.com/*',
    'https://www.googleapis.com/*'
  ],
  content_scripts: [{
    js: ['src/content/main.tsx'],
    matches: ['https://*/*', 'http://*/*'],
    run_at: 'document_idle'
  }],
  oauth2: {
    client_id: '866896908660-gvkujh75pqtct9o12ra8obg234o21dof.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ]
  },
  web_accessible_resources: [{
    resources: ['src/pages/history.html', 'assets/*'],
    matches: ['<all_urls>']
  }]
})
