import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from '@tanstack/react-start'
import { xpSerializationAdapter } from '#/lib/xp'
import { timingMiddleware } from '#/middleware/timing'

/**
 * Global REQUEST middleware: runs for every request the server handles —
 * SSR page loads, server routes and server-function RPCs alike.
 */
const requestLogger = createMiddleware().server(
	async ({ next, request, pathname }) => {
		const started = performance.now()
		const result = await next()
		const ms = (performance.now() - started).toFixed(1)
		try {
			result.response.headers.set('x-questboard-time', `${ms}ms`)
		} catch {
			// Some responses (e.g. redirects) have immutable headers.
		}
		console.log(`[questboard] ${request.method} ${pathname} ${ms}ms`)
		return result
	},
)

/**
 * Built-in CSRF protection for cookie-authenticated mutations. Checks
 * Sec-Fetch-Site / Origin / Referer on anything that isn't a safe method.
 */
const csrf = createCsrfMiddleware({
	filter: ({ request }) =>
		!['GET', 'HEAD', 'OPTIONS'].includes(request.method),
})

export const startInstance = createStart(() => ({
	requestMiddleware: [requestLogger, csrf],
	functionMiddleware: [timingMiddleware],
	serializationAdapters: [xpSerializationAdapter],
}))

declare module '@tanstack/react-start' {
	interface Register {
		config: typeof startInstance
	}
}
