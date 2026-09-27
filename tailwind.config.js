export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'theme-bg': 'var(--theme-bg)',
        'theme-surface': 'var(--theme-surface)',
        'theme-card': 'var(--theme-card)',
        'theme-subcard-bg': 'var(--theme-subcard-bg)',
        'theme-input': 'var(--theme-input)',
        'theme-primary': 'var(--theme-primary)',
        'theme-text': 'var(--theme-text)',
        'theme-text-muted': 'var(--theme-text-muted)',
        'theme-border-subtle': 'var(--theme-border-subtle)',
        brand: {
          50:  '#ede9fe',
          100: '#ddd6fe',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        surface: {
          900: '#0f0e17',   // fondo más oscuro (body)
          800: '#1a1826',   // fondo sidebar
          700: '#221f33',   // fondo cards
          600: '#2d2a42',   // hover / bordes
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/container-queries')
  ]
}
