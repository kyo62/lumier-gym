/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#FAFAFA", // Off-white
                foreground: "#333333", // Charcoal Grey
                primary: {
                    DEFAULT: "#D4AF37", // Champagne Gold
                    foreground: "#FFFFFF",
                },
                secondary: {
                    DEFAULT: "#F5F5F0", // Pale Beige
                    foreground: "#333333",
                },
                muted: {
                    DEFAULT: "#8E8E93", // Warm Gray
                    foreground: "#FAFAFA"
                }
            },
            fontFamily: {
                sans: ['"Helvetica Neue"', 'Arial', '"Hiragino Kaku Gothic ProN"', '"Hiragino Sans"', 'Meiryo', 'sans-serif'],
                serif: ['"Cormorant Garamond"', '"Shippori Mincho"', 'serif'],
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
                'fade-in': 'fadeIn 1s ease-out forwards',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            },
        },
        plugins: [],
    }
}
