import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { readSessionUser } from '#/server/session.server'

/**
 * Server-function middleware: reads the signed session cookie and puts
 * `user` (or null) on the context. The `.server()` body (and the
 * session.server import it uses) is stripped from the client bundle.
 */
export const sessionMiddleware = createMiddleware({ type: 'function' }).server(
	({ next }) => next({ context: { user: readSessionUser() } }),
)

/**
 * Guards private server functions. This — not the route's beforeLoad —
 * is the real security boundary: server functions are callable endpoints.
 */
export const requireUser = createMiddleware({ type: 'function' })
	.middleware([sessionMiddleware])
	.server(({ next, context }) => {
		if (!context.user) {
			throw redirect({ to: '/login', search: { redirect: '/quests' } })
		}
		return next({ context: { user: context.user } })
	})

/**
 * Request middleware for server routes (raw HTTP). Instead of throwing,
 * it short-circuits with a JSON 401 response.
 */
export const apiAuth = createMiddleware().server(({ next }) => {
	const user = readSessionUser()
	if (!user) {
		return Response.json(
			{ error: 'Unauthorized: sign in at /login first' },
			{ status: 401 },
		)
	}
	return next({ context: { user } })
})
