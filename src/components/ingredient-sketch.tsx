// Hand-drawn line sketches standing in for ingredient photography — a small
// botanical-notebook icon set, one per category, instead of stock emoji or
// generic dashboard iconography (spec §26). Single ink stroke via
// `currentColor`, so it inherits whatever text colour the parent sets.
const SKETCH_PATHS: Record<string, string> = {
  Fruit: `<path d="M17,11 C11,15 9,25 15,34 C19,40 28,40 32,33 C36,25 34,13 27,10 C23,8 19,8 17,11 Z"/>
    <path d="M23,9 L23,4"/><path d="M23,5 C27,3 30,5 28,8 C26,10 23,9 23,5 Z"/>`,
  Grain: `<path d="M24,6 L24,42"/>
    <path d="M24,10 L18,6 M24,10 L30,6"/><path d="M24,15 L18,11 M24,15 L30,11"/>
    <path d="M24,20 L18,16 M24,20 L30,16"/><path d="M24,25 L18,21 M24,25 L30,21"/>
    <path d="M24,30 L19,27 M24,30 L29,27"/>`,
  Millet: `<path d="M24,6 L24,42"/>
    <path d="M24,10 L18,6 M24,10 L30,6"/><path d="M24,15 L18,11 M24,15 L30,11"/>
    <path d="M24,20 L18,16 M24,20 L30,16"/><path d="M24,25 L18,21 M24,25 L30,21"/>
    <path d="M24,30 L19,27 M24,30 L29,27"/>`,
  'Sugar / Sweetener': `<path d="M15,20 Q15,13 21,13 L27,13 Q33,13 33,20 L33,31 Q33,38 27,38 L21,38 Q15,38 15,31 Z"/>
    <path d="M17,21 L31,21 M17,27 L31,27 M17,33 L28,33"/>`,
  Spice: `<path d="M19,10 C15,15 13,23 17,30 C20,36 27,37 31,32 C34,28 33,22 29,20"/>
    <path d="M19,10 C18,7 20,5 23,6"/>`,
  Herb: `<path d="M24,8 L24,40"/>
    <path d="M24,14 C19,12 15,15 14,19 C18,20 22,18 24,14 Z"/>
    <path d="M24,14 C29,12 33,15 34,19 C30,20 26,18 24,14 Z"/>
    <path d="M24,22 C19,20 15,23 14,27 C18,28 22,26 24,22 Z"/>
    <path d="M24,22 C29,20 33,23 34,27 C30,28 26,26 24,22 Z"/>`,
  Flower: `<circle cx="24" cy="22" r="3"/>
    <path d="M24,19 C20,15 20,9 24,7 C28,9 28,15 24,19 Z"/>
    <path d="M27,20 C32,18 37,20 38,25 C33,26 28,24 27,20 Z"/>
    <path d="M27,24 C31,28 31,34 27,37 C24,33 24,28 27,24 Z"/>
    <path d="M21,24 C17,28 17,34 21,37 C24,33 24,28 21,24 Z"/>
    <path d="M21,20 C16,18 11,20 10,25 C15,26 20,24 21,20 Z"/>
    <path d="M24,25 L24,42"/>`,
  Root: `<path d="M20,15 L28,15 C30,15 30,17 29,20 L26,35 C25,39 23,39 22,35 L19,20 C18,17 18,15 20,15 Z"/>
    <path d="M21,15 C19,10 21,7 21,7 M24,15 L24,6 M27,15 C29,10 27,7 27,7"/>`,
  Botanical: `<path d="M24,8 C35,14 35,30 24,40 C13,30 13,14 24,8 Z"/>
    <path d="M24,10 L24,38"/>
    <path d="M24,16 L18,12 M24,22 L17,19 M24,28 L18,26 M24,16 L30,12 M24,22 L31,19 M24,28 L30,26"/>`,
  Dairy: `<path d="M20,10 L28,10 L28,14"/><path d="M20,10 L20,14"/>
    <path d="M17,19 C16,16 17,14 20,14 L28,14 C31,14 32,16 31,19 L29,30 C28,35 26,38 24,38 C22,38 20,35 19,30 Z"/>`,
  'Fermentation culture': `<path d="M17,15 L17,33 Q17,38 22,38 L26,38 Q31,38 31,33 L31,15"/>
    <path d="M13,15 L35,15 L35,11 L13,11 Z"/>
    <circle cx="20" cy="7" r="1.1" fill="currentColor" stroke="none"/>
    <circle cx="26" cy="4.5" r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="23" cy="2.5" r="0.7" fill="currentColor" stroke="none"/>`,
  Other: `<path d="M24,42 C24,32 18,28 15,22"/><path d="M24,42 C24,32 30,28 33,22"/>
    <ellipse cx="24" cy="43" rx="3" ry="2"/>`
};

export function IngredientSketch({
  category,
  size = 26,
  className
}: {
  category: string;
  size?: number;
  className?: string;
}) {
  const inner = SKETCH_PATHS[category] ?? SKETCH_PATHS.Other ?? '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'block' }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
