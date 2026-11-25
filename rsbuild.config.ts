import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild'

export default defineConfig({
	server: {
		port: 3000,
	},
	plugins: [
		pluginReact(),
		pluginTailwindcss(),
		tanstackStart({
			// Static prerendering: only the Feature Map is rendered to HTML at
			// build time. Everything else is server-rendered per request.
			prerender: {
				enabled: true,
				autoStaticPathsDiscovery: false,
				crawlLinks: false,
				failOnError: true,
			},
			pages: [{ path: '/about' }],
		}),
	],
})
