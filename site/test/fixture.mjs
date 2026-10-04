// A small valid content object. Returns a fresh copy so a test can change it.
export const fixture = () => ({
  sites: {
    'byjoba.com': {
      title: 'byjoba',
      pageTitle: 'byjoba — things',
      description: 'Things made.',
      intro: 'Software and hardware.',
      turnstileSiteKey: 'KEY-B',
      sections: [
        { title: 'Hardware', category: 'hardware' },
        { title: 'Apps', category: 'apps' },
      ],
    },
    'jonasbarsten.com': {
      title: 'Jonas Barsten',
      pageTitle: 'Jonas Barsten — a list',
      description: 'A longer description.',
      intro: 'A list.',
      jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: 'Jonas Barsten' },
      turnstileSiteKey: 'KEY-J',
      sections: [
        { title: 'Music', category: 'music' },
        { title: 'Software and hardware', from: 'byjoba.com' },
        { title: 'Advocacy', category: 'advocacy' },
      ],
    },
  },
  projects: [
    {
      id: 'kiwi',
      name: 'Kiwi',
      site: 'byjoba.com',
      category: 'hardware',
      summary: 'An instrument.',
      about: 'Runs on a Raspberry Pi.',
      status: 'wip',
      links: [{ label: 'source', url: 'https://example.com/kiwi' }],
    },
    { id: 'atlanter', name: 'Atlanter', site: 'jonasbarsten.com', category: 'music', summary: 'Composer and drummer.', years: '2013–' },
    { id: 'vierlive', name: 'VIER.LIVE', site: 'jonasbarsten.com', category: 'music', summary: 'Streaming platform.', role: 'co-founder', years: '2020–2021' },
  ],
});
