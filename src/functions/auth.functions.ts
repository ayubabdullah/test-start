import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl, setResponseHeader } from '@tanstack/react-start/server'
import { supabaseMiddleware } from '#/middleware/auth'
import { myDisplayName } from '#/server/quests.server'

/** Called from the root route's beforeLoad to populate router context. */
export const getSessionUser = createServerFn({ method: 'GET' })
	.middleware([supabaseMiddleware])
	.handler(async ({ context }) => {
		// Identity-dependent response: never let a shared cache store it.
		setResponseHeader('Cache-Control', 'private, no-store')
		if (!context.userId) return null
		const name = await myDisplayName(context.supabase, context.userId)
		return { id: context.userId, name: name ?? 'Adventurer' }
	})

/** Only allow same-site relative paths to avoid open redirects. */
function safeRedirect(value: FormDataEntryValue | null) {
	const target = typeof value === 'string' ? value : ''
	return target.startsWith('/') && !target.startsWith('//') ? target : '/quests'
}

function field(data: FormData, key: string) {
	return String(data.get(key) ?? '').trim()
}

function parseCredentials(data: FormData) {
	const email = field(data, 'email').toLowerCase()
	const password = String(data.get('password') ?? '')
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new Error('Enter a valid email address.')
	}
	if (password.length < 8) {
		throw new Error('Passwords need at least 8 characters.')
	}
	return { email, password, redirectTo: safeRedirect(data.get('redirect')) }
}

export const signIn = createServerFn({ method: 'POST' })
	.middleware([supabaseMiddleware])
	.validator((data: FormData) => {
		if (!(data instanceof FormData)) throw new Error('Expected form data')
		return parseCredentials(data)
	})
	.handler(async ({ data, context }) => {
		const { error } = await context.supabase.auth.signInWithPassword({
			email: data.email,
			password: data.password,
		})
		if (error) {
			// Same message for unknown email and wrong password.
			throw new Error(
				error.code === 'email_not_confirmed'
					? 'Confirm your email first — check your inbox.'
					: 'Wrong email or password.',
			)
		}
		// Session cookies were written via setCookie; useServerFn turns this
		// into a router navigation.
		throw redirect({ href: data.redirectTo })
	})

export const signUp = createServerFn({ method: 'POST' })
	.middleware([supabaseMiddleware])
	.validator((data: FormData) => {
		if (!(data instanceof FormData)) throw new Error('Expected form data')
		const name = field(data, 'name')
		if (!/^[\p{L}\p{N} _-]{2,24}$/u.test(name)) {
			throw new Error('Names are 2–24 letters, numbers, spaces, - or _.')
		}
		return { ...parseCredentials(data), name }
	})
	.handler(async ({ data, context }) => {
		const { data: available, error: rpcError } = await context.supabase.rpc(
			'display_name_available',
			{ name: data.name },
		)
		if (rpcError) throw new Error('Could not check that name. Try again.')
		if (!available) throw new Error('That adventurer name is already taken.')

		const confirmUrl = new URL('/auth/confirm', getRequestUrl())
		confirmUrl.searchParams.set('next', data.redirectTo)

		const { data: result, error } = await context.supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: {
				// Read by the on_auth_user_created trigger to create the profile.
				data: { display_name: data.name },
				emailRedirectTo: confirmUrl.toString(),
			},
		})
		if (error) {
			if (error.code === 'user_already_exists') {
				throw new Error('That email already has an account — sign in instead.')
			}
			// A 5xx here means the profile trigger failed — almost always the
			// name being claimed between our check and the insert. Don't leak
			// the raw database error.
			if ((error.status ?? 500) >= 500) {
				console.error('[questboard] signUp failed:', error.message)
				throw new Error('That adventurer name was just taken. Try another.')
			}
			throw new Error(error.message)
		}

		// Email confirmation off (local dev default): we're signed in already.
		if (result.session) throw redirect({ href: data.redirectTo })

		// Confirmation on (hosted default): the user must click the email link.
		return { checkEmail: true }
	})

/** Handles the link in the confirmation email (see routes/auth/confirm.tsx). */
export const confirmEmail = createServerFn({ method: 'GET' })
	.middleware([supabaseMiddleware])
	.validator((input: { tokenHash: string; type: string; next?: string }) => {
		const types = ['signup', 'email', 'invite', 'magiclink', 'recovery'] as const
		const type = types.find((t) => t === input.type)
		if (!type || !input.tokenHash) throw new Error('Invalid confirmation link')
		return {
			tokenHash: input.tokenHash,
			type,
			next: safeRedirect(input.next ?? null),
		}
	})
	.handler(async ({ data, context }) => {
		const { error } = await context.supabase.auth.verifyOtp({
			token_hash: data.tokenHash,
			type: data.type,
		})
		if (error) throw new Error('This confirmation link is invalid or expired.')
		throw redirect({ href: data.next })
	})

export const signOut = createServerFn({ method: 'POST' })
	.middleware([supabaseMiddleware])
	.handler(async ({ context }) => {
		await context.supabase.auth.signOut()
		throw redirect({ to: '/' })
	})
