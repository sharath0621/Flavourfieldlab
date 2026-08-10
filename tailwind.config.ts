import type { Config } from 'tailwindcss';

// Design tokens ported 1:1 from the interactive prototype (flavour-field-lab.html)
// so the production app matches the validated visual direction: calm, editorial,
// field-notebook — not a generic AI SaaS dashboard.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4EFE4',
        'bg-alt': '#ECE4D3',
        paper: '#FFFDF7',
        ink: '#221D15',
        'ink-soft': '#5B5747',
        'ink-faint': '#8B8570',
        rule: '#DBD1B8',
        'rule-soft': '#E7DFC9',
        rust: '#B14D2C',
        'rust-bg': '#F5DED1',
        sage: '#556B41',
        'sage-bg': '#E4EAD9',
        fact: '#3E6A3B',
        'fact-bg': '#E2EDDD',
        verified: '#25462B',
        'verified-bg': '#D3E3CE',
        reported: '#3C5580',
        'reported-bg': '#DEE5F1',
        inference: '#93701A',
        'inference-bg': '#F2E7C6',
        hypothesis: '#B1552A',
        'hypothesis-bg': '#F5DFCC',
        idea: '#3C5580',
        'idea-bg': '#DEE5F1',
        research: '#2C685D',
        'research-bg': '#DBEAE5',
        'conf-high': '#3E6A3B',
        'conf-medium': '#93701A',
        'conf-low': '#A14634'
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '3px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(34,29,21,0.06), 0 8px 24px -12px rgba(34,29,21,0.18)'
      }
    }
  },
  plugins: []
};

export default config;
