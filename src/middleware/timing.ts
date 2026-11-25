import { createMiddleware } from '@tanstack/react-start'
import { recordRpc } from '#/lib/rpc-stats'

/**
 * browser ──sendContext{ clientTz }──▶ server
 *
 * The client phase attaches the browser's timezone; the server phase
 * re-validates it (sendContext is untrusted input) and exposes it as
 * typed `context.clientTz` to any server function that lists this
 * middleware.
 */
export const clientInfoMiddleware = createMiddleware({ type: 'function' })
	.client(({ next }) =>
		next({
			sendContext: {
				clientTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
		}),
	)
	.server(({ next, context }) => {
		const tz = String(context.clientTz ?? 'UTC').slice(0, 64)
		return next({ context: { clientTz: tz } })
	})

/** browser ◀──sendContext{ fnName, serverTime }── server */
const serverClockMiddleware = createMiddleware({ type: 'function' }).server(
	({ next, serverFnMeta }) =>
		next({
			sendContext: { fnName: serverFnMeta.name, serverTime: new Date() },
		}),
)

/**
 * Registered globally in src/start.ts so it wraps every createServerFn.
 * Its client phase times the round trip and reads what the server sent
 * back, feeding the "last RPC" badge in the footer.
 */
export const timingMiddleware = createMiddleware({ type: 'function' })
	.middleware([clientInfoMiddleware, serverClockMiddleware])
	.client(async ({ next }) => {
		const started = performance.now()
		const result = await next()
		// .client() also runs on the server during SSR; only record in the browser.
		if (typeof window !== 'undefined') {
			recordRpc({
				name: result.context.fnName,
				ms: Math.round(performance.now() - started),
				serverTime: result.context.serverTime,
			})
		}
		return result
	})
