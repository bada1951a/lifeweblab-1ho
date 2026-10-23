import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  loader: () => [], // 임시 로더 (마크다운 파일을 직접 읽어옵니다)
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    category: z.string(),
    author: z.string(),
    image: z.string(),
    avatarIcon: z.string(),
  }),
});

export const collections = { blog };
