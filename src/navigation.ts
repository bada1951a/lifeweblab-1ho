import { getPermalink, getBlogPermalink, getHomePermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Home',
      href: getHomePermalink(),
    },
    {
      text: 'Blog',
      href: getBlogPermalink(),
    },
    {
      text: 'Tech',
      href: getPermalink('/category/tech'),
    },
    // 상단 네비게이션 지구본 다국어 선택 드롭다운
    {
      text: '🌐 Language',
      links: [
        { text: '🇰🇷 한국어 (KO)', href: '/ko' },
        { text: '🇺🇸 English (EN)', href: '/en' },
        { text: '🇯🇵 日本語 (JA)', href: '/ja' },
        { text: '🇩🇪 Deutsch (DE)', href: '/de' },
        { text: '🇫🇷 Français (FR)', href: '/fr' },
        { text: '🇪🇸 Español (ES)', href: '/es' },
      ],
    },
  ],
  actions: [{ text: 'Explore Articles', href: getBlogPermalink() }],
};

export const footerData = {
  links: [
    {
      title: 'Categories',
      links: [
        { text: 'All Articles', href: getBlogPermalink() },
        { text: 'Tech', href: getPermalink('/category/tech') },
      ],
    },
    {
      title: 'Languages',
      links: [
        { text: '한국어', href: '/ko' },
        { text: 'English', href: '/en' },
        { text: '日本語', href: '/ja' },
        { text: 'Deutsch', href: '/de' },
        { text: 'Français', href: '/fr' },
        { text: 'Español', href: '/es' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'About Us', href: getPermalink('/about') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
    { text: 'Contact Us', href: getPermalink('/contact') },
    { text: 'Terms of Service', href: getPermalink('/terms') },
  ],
  socialLinks: [],
  footNote: `
    © 2026 LifeWebLab. All rights reserved.
  `,
};
