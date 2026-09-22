export const BACKGROUNDS = {
  default: {
    colors: ['#07070F', '#0D0D1A'],
    bubbleMe: '#6C63FF',
    bubbleThem: '#111120',
  },
  purple_rain: {
    colors: ['#1a0533', '#2D1B69'],
    bubbleMe: '#6C63FF',
    bubbleThem: '#2D1B69',
  },
  midnight: {
    colors: ['#0f0c29', '#302b63'],
    bubbleMe: '#6C63FF',
    bubbleThem: '#302b63',
  },
  ocean: {
    colors: ['#0052D4', '#4364F7'],
    bubbleMe: '#6FB1FC',
    bubbleThem: '#0052D4',
  },
  forest: {
    colors: ['#0f3443', '#34e89e'],
    bubbleMe: '#34e89e',
    bubbleThem: '#0f3443',
  },
  sunset: {
    colors: ['#FF512F', '#DD2476'],
    bubbleMe: '#FF512F',
    bubbleThem: '#8B0000',
  },
  aurora: {
    colors: ['#000428', '#004e92'],
    bubbleMe: '#00c6ff',
    bubbleThem: '#004e92',
  },
  rose: {
    colors: ['#1a1a2e', '#16213e'],
    bubbleMe: '#e94560',
    bubbleThem: '#16213e',
  },
  galaxy: {
    colors: ['#0d0d2b', '#1a1a4e'],
    bubbleMe: '#6C63FF',
    bubbleThem: '#1a1a4e',
  },
  neon: {
    colors: ['#0a0a0a', '#1a0a2e'],
    bubbleMe: '#6C63FF',
    bubbleThem: '#1a0a2e',
  },
  worldgram_branded: {
    colors: ['#0A0A0F', '#1A1A2E'],
    bubbleMe: '#6C63FF',
    bubbleThem: '#1A1A2E',
    branded: true,
  },
};

export const getBackground = (id) => BACKGROUNDS[id] || BACKGROUNDS.default;
