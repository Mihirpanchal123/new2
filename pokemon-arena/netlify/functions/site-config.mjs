// /api/site-config on Netlify: the site config (server/site-config-core.mjs), kept in Netlify Blobs
import { getStore } from '@netlify/blobs';
import { handle } from '../../server/site-config-core.mjs';

export default async req => {
  const store = getStore('site-config');
  const body = req.method === 'POST' ? await req.text() : '';
  const r = await handle({ method: req.method, body }, process.env, {
    get: () => store.get('config', { type: 'json' }),
    set: c => store.setJSON('config', c)
  });
  return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/site-config' };
