/**
 * Supabase ⇄ TanStack Start wiring (server only).
 *
 * `@supabase/ssr` keeps the Supabase Auth session in cookies. We give it
 * Start's request/response cookie helpers, so:
 *   • reads come from the incoming request's cookies, and
 *   • token refreshes / sign-in / sign-out write Set-Cookie headers onto
 *     the outgoing response (SSR page, server function or server route).
 *
 * The `.server.ts` suffix means this file — and the Supabase keys it reads —
 * can never be bundled for the browser.
 */
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
	getCookies,
	getRequest,
	setCookie,
	setResponseHeader,
} from '@tanstack/react-start/server'
import type { Database } from '#/lib/database.types'

export type Supabase = SupabaseClient<Database>

// One client per request. During SSR several server functions run inside
// the same request (root beforeLoad + loaders); sharing a client means an
// expiring access token is refreshed exactly once.
const perRequest = new WeakMap<Request, Supabase>()

export function getSupabase(): Supabase {
	const request = getRequest()
	const cached = perRequest.get(request)
	if (cached) return cached

	// Read per request, never at module scope (edge runtimes inject env late).
	const url = process.env.SUPABASE_URL
	const key = process.env.SUPABASE_PUBLISHABLE_KEY
	if (!url || !key) {
		throw new Error(
			'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set (see .env.example).',
		)
	}

	const client = createServerClient<Database>(url, key, {
		cookies: {
			getAll() {
				return Object.entries(getCookies()).map(([name, value]) => ({
					name,
					value: value ?? '',
				}))
			},
			setAll(cookies, headers) {
				for (const { name, value, options } of cookies) {
					// @supabase/ssr defaults to script-readable cookies so a
					// browser client can share the session. QuestBoard talks to
					// Supabase only from the server, so lock them down.
					setCookie(name, value, {
						...options,
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
					})
				}
				// Supabase sends no-cache headers with auth cookies so CDNs
				// never cache one user's session for another.
				for (const [name, value] of Object.entries(headers)) {
					setResponseHeader(name, value)
				}
			},
		},
	})

	perRequest.set(request, client)
	return client
}

/**
 * Verifies the session JWT (signature + expiry) and returns the user id.
 * `getClaims()` — not `getSession()` — is the call to trust on the server:
 * cookie contents are client-controlled until the JWT is verified.
 */
export async function getVerifiedUserId(supabase: Supabase) {
	const { data, error } = await supabase.auth.getClaims()
	if (error || !data?.claims.sub) return null
	return data.claims.sub
}
