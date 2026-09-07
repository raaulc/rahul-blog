export type View = 'home' | 'see' | 'choose' | 'play' | 'learn' | 'adjust';

export const NAV: { id: View; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'see', label: 'See' },
  { id: 'choose', label: 'Choose' },
  { id: 'play', label: 'Play' },
  { id: 'learn', label: 'Learn' },
  { id: 'adjust', label: 'Adjust' },
];
