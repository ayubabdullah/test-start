import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { sessionMiddleware } from '#/middleware/auth'
import { readDb, writeDb } from '#/server/db.server'
import {
	destroySession,
	hashPassphrase,
	issueSession,
	verifyPassphrase,
} from '#/server/session.server'

/** Called from the root route's beforeLoad to populate router context. */
export const getSessionUser = createServerFn({ method: 'GET' })
	.middleware([sessionMiddleware])
	.handler(({ context }) => {
		// Identity-dependent response: never let a shared cache store it.
		setResponseHeader('Cache-Control', 'private, no-store')
		return context.user ? { name: context.user } : null
	})

/** Only allow same-site relative paths to avoid open redirects. */
function safeRedirect(value: FormDataEntryValue | null) {
	const target = typeof value === 'string' ? value : ''
	return target.startsWith('/') && !target.startsWith('//') ? target : '/quests'
}

/**
 * Sign in OR sign up. The first login for a name claims it with the
 * passphrase; later logins must match. Accepts FormData so the form works
 * as a plain HTML post too.
 */
export const login = createServerFn({ method: 'POST' })
	.validator((data: FormData) => {
		if (!(data instanceof FormData)) throw new Error('Expected form data')
		const name = String(data.get('name') ?? '').trim()
		const passphrase = String(data.get('passphrase') ?? '')
		if (!/^[\p{L}\p{N} _-]{2,24}$/u.test(name)) {
			throw new Error('Names are 2–24 letters, numbers, spaces, - or _.')
		}
		if (passphrase.length < 4) {
			throw new Error('Your passphrase needs at least 4 characters.')
		}
		return { name, passphrase, redirectTo: safeRedirect(data.get('redirect')) }
	})
	.handler(async ({ data }) => {
		const { adventurers } = await readDb()
		const existing = adventurers[data.name.toLowerCase()]

		if (existing) {
			if (!(await verifyPassphrase(data.passphrase, existing.passphrase))) {
				// Same message whether the name or passphrase was wrong.
				throw new Error('That name is taken or the passphrase is wrong.')
			}
		} else {
			const passphrase = await hashPassphrase(data.passphrase)
			await writeDb((db) => {
				db.adventurers[data.name.toLowerCase()] = {
					name: data.name,
					passphrase,
					joinedAt: new Date().toISOString(),
				}
			})
		}

		issueSession(existing?.name ?? data.name)
		// useServerFn on the client turns this into a router navigation.
		throw redirect({ href: data.redirectTo })
	})

export const logout = createServerFn({ method: 'POST' }).handler(() => {
	destroySession()
	throw redirect({ to: '/' })
})
