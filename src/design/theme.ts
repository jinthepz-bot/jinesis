// Dark, warm theme for the coach screens. (The chat screen still uses src/theme.ts.)
export const colors = {
  background: '#1c1a17',
  surface: '#262320',
  surface2: '#302c27',
  border: '#423c34',
  text: '#f2ede4',
  textMuted: '#a89e8f',
  accent: '#c98a3b', // warm amber: progress, buttons
  accentStrong: '#b0472f', // warnings, overdue
  success: '#7f9d6f',
  onAccent: '#1c1a17', // text/icons placed on accent
  // Low-opacity tints for badges and highlighted backgrounds.
  accentSoft: 'rgba(201, 138, 59, 0.14)',
  accentStrongSoft: 'rgba(176, 71, 47, 0.18)',
  successSoft: 'rgba(127, 157, 111, 0.16)',
};

// Rising strengths of the accent, used for the activity heatmap (level 1..4).
export const accentScale = [
  'rgba(201, 138, 59, 0.26)',
  'rgba(201, 138, 59, 0.48)',
  'rgba(201, 138, 59, 0.74)',
  colors.accent,
];

export const radius = {
  card: 10,
  control: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Font family names as registered by expo-font (see src/design/fonts.tsx).
export const fontFamilies = {
  display: 'BigShouldersDisplay_800ExtraBold',
  displayBold: 'BigShouldersDisplay_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
};
