import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        yellow: { DEFAULT: '#F5A623', dark: '#C8841A', light: '#FEF3DC' },
        construction: { dark: '#1A1A1A', gray: '#3D3D3D', mid: '#6B6B6B', light: '#F4F2EE' }
      },
      fontFamily: { syne: ['Syne', 'sans-serif'], dm: ['DM Sans', 'sans-serif'] }
    }
  },
  plugins: []
}
export default config
