import type { Locale } from './i18n';
export interface FrontendProject {
  name: string;
  year: string;
  sector: Record<Locale, string>;
  description: Record<Locale, string>;
  image: string;
  technology: string[];
  demo: string;
  source: string;
}
// Add entries only after their public demo and primary flow have been verified.
export const frontendProjects: FrontendProject[] = [
  {
    name: 'Maison Sol',
    year: '2026',
    sector: { en: 'Hospitality', fr: 'Hôtellerie', it: 'Ospitalità' },
    description: {
      en: 'A Mediterranean hideaway, from thoughtful room discovery to a complete, simulated stay.',
      fr: 'Une parenthèse méditerranéenne, de la découverte des chambres à une réservation entièrement simulée.',
      it: 'Un rifugio mediterraneo, dalla scoperta delle camere a un soggiorno completamente simulato.',
    },
    image: '/projects/maison-sol.jpg',
    technology: ['React', 'TypeScript', 'Vite'],
    demo: 'https://khalilbenali1.github.io/maison-sol-react/',
    source: 'https://github.com/khalilBenAli1/maison-sol-react',
  },
];
