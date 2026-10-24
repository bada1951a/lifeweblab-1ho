import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('post');
  const baseUrl = 'https://lifeweblab.com';

  const staticPages = [
    '',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms',
  ];

  const postUrls = posts.map((post) => {
    const cleanId = post.id.replace(/\.[^/.]+$/, '');
    const parts = cleanId.split('/');
    const lang = parts[0];
    const slug = parts.slice(1).join('/');
    const date = post.data.publishDate 
      ? new Date(post.data.publishDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];

    return `
  <url>
    <loc>${baseUrl}/${lang}/${slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const staticUrls = staticPages.map((page) => `
  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page === '' ? '1.0' : '0.5'}</priority>
  </url>`).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${postUrls}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
