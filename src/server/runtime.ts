// Marker import: this file can only be imported from server code, even
// though its name doesn't end in `.server.ts`.
import '@tanstack/react-start/server-only'
import { createServerOnlyFn } from '@tanstack/react-start'

/** Throws if ever called in the browser. */
export const getRuntime = createServerOnlyFn(() => ({
	runtime: process.versions.bun
		? `Bun ${process.versions.bun}`
		: `Node ${process.version}`,
	platform: `${process.platform}/${process.arch}`,
	uptimeSeconds: Math.round(process.uptime()),
	// Server-only env var (no PUBLIC_ prefix): read per request, never shipped.
	database: /^https?:\/\/(127\.0\.0\.1|localhost)/.test(
		process.env.SUPABASE_URL ?? '',
	)
		? 'local Supabase'
		: 'hosted Supabase',
}))
