import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { getSupabase, getVerifiedUserId } from '#/server/supabase.server'

/**
 * Server-function middleware: puts the request-scoped Supabase client and
 * the verified user id (or null) on the context. The `.server()` body and
 * the supabase.server import are stripped from the client bundle.
 */
export const supabaseMiddleware = createMiddleware({ type: 'function' }).server(
	async ({ next }) => {
		const supabase = getSupabase()
		const userId = await getVerifiedUserId(supabase)
		return next({ context: { supabase, userId } })
	},
)

/**
 * Guards private server functions. This — not the route's beforeLoad — is
 * the real security boundary: server functions are callable endpoints.
 * (Row Level Security in Postgres is the second, independent layer.)
 */
export const requireUser = createMiddleware({ type: 'function' })
	.middleware([supabaseMiddleware])
	.server(({ next, context }) => {
		if (!context.userId) {
			throw redirect({ to: '/login', search: { redirect: '/quests' } })
		}
		return next({ context: { userId: context.userId } })
	})

/**
 * Request middleware for server routes (raw HTTP). Instead of throwing,
 * it short-circuits with a JSON 401 response.
 */
export const apiAuth = createMiddleware().server(async ({ next }) => {
	const supabase = getSupabase()
	const userId = await getVerifiedUserId(supabase)
	if (!userId) {
		return Response.json(
			{ error: 'Unauthorized: sign in at /login first' },
			{ status: 401 },
		)
	}
	return next({ context: { supabase, userId } })
})
