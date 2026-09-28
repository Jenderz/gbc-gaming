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
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            },
            colors: {
                ios: {
                    bg: '#F8FAF9', // Clean light bg with subtle emerald undertone
                    card: '#FFFFFF',
                    text: '#09150E', // High-contrast deep slate green
                    subtext: '#52665B',
                    blue: '#00361F', // GBC Gaming Primary Racing Green
                    gold: '#EBBB03', // GBC Gaming Accent Gold
                    red: '#E11D48',  // Semantic Alert Red
                    green: '#10B981', // Semantic emerald
                    separator: '#DDE5E0',
                },
                gbc: {
                    green: '#00361F',
                    'green-hover': '#004D2C',
                    'green-light': '#0A5C37',
                    'green-dark': '#002414',
                    gold: '#EBBB03',
                    'gold-hover': '#D4A802',
                    'gold-light': '#FCE87B',
                    'gold-dark': '#B89200',
                    dark: '#060F0A',
                    'dark-surface': '#0C1C13',
                    'dark-card': '#11251A',
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 54, 31, 0.08)',
                'glass-gold': '0 8px 32px 0 rgba(235, 187, 3, 0.15)',
                'glow-green': '0 0 25px rgba(0, 54, 31, 0.35)',
                'glow-gold': '0 0 25px rgba(235, 187, 3, 0.35)',
            }
        },
    },
    plugins: [],
}
