/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"gradient-conic":
					"conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
			},
			gridTemplateColumns: {
				40: "repeat(40, minmax(0, 1fr))",
			},
			gridTemplateRows: {
				25: "repeat(25, minmax(0, 1fr))",
			},
			// Safe area utilities for 1920x1080 optimization
			spacing: {
				"safe-top": "env(safe-area-inset-top, 0px)",
				"safe-bottom": "env(safe-area-inset-bottom, 0px)",
				"safe-left": "env(safe-area-inset-left, 0px)",
				"safe-right": "env(safe-area-inset-right, 0px)",
			},
			// Optimized sizes for 1920x1080
			screens: {
				hd: "1920px",
			},
			maxWidth: {
				"game-container": "1920px",
			},
		},
	},
	plugins: [],
};
