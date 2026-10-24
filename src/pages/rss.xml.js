import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('post');
  
  return rss({
    title: 'LifeWebLab',
    description: 'Technical troubleshooting and modern IT workflows.',
    site: context.site,
    items: posts.map((post) => {
      const cleanId = post.id.replace(/\.[^/.]+$/, '');
      const parts = cleanId.split('/');
      const lang = parts[0];
      const slug = parts.slice(1).join('/');

      return {
        title: post.data.title,
        pubDate: post.data.publishDate ? new Date(post.data.publishDate) : new Date(),
        description: post.data.description || post.data.excerpt || '',
        link: `/${lang}/${slug}/`,
      };
    }),
  });
}
