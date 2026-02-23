/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                snap: {
                    yellow: '#FFFC00',
                    purple: '#A855F7',
                    pink: '#EC4899',
                    blue: '#6366F1',
                    dark: '#0F0F23',
                    darker: '#0A0A1B',
                    card: '#1A1A2E',
                    cardLight: '#F8F9FE',
                    border: '#2D2D4A',
                    borderLight: '#E5E7EB',
                },
            },
            backgroundImage: {
                'gradient-snap': 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #6366F1 100%)',
                'gradient-card': 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.1) 100%)',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(168,85,247,0.3)',
                'glow-pink': '0 0 20px rgba(236,72,153,0.3)',
            },
        },
    },
    plugins: [],
}
