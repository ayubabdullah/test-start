import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { login } from '#/functions/auth.functions'

export const Route = createFileRoute('/login')({
	// Typed, validated search params: /login?redirect=/quests/abc
	// Only same-site relative paths survive, so ?redirect can't send users
	// to another origin.
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect:
			typeof search.redirect === 'string' &&
			search.redirect.startsWith('/') &&
			!search.redirect.startsWith('//')
				? search.redirect
				: undefined,
	}),
	// Already signed in? Skip the form.
	beforeLoad: ({ context, search }) => {
		if (context.user) throw redirect({ href: search.redirect ?? '/quests' })
	},
	head: () => ({ meta: [{ title: 'Sign in · QuestBoard' }] }),
	component: LoginPage,
})

function LoginPage() {
	const search = Route.useSearch()
	const loginFn = useServerFn(login)
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-md rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">The Guild Hall</p>
				<h1 className="display-title mb-2 text-3xl font-bold">Sign in or join</h1>
				<p className="demo-muted mb-6 text-sm">
					New name? It's yours — the passphrase you pick now becomes your key.
				</p>

				<form
					className="grid gap-4"
					onSubmit={async (event) => {
						event.preventDefault()
						setBusy(true)
						setError(null)
						try {
							// Sends FormData; the server fn throws a redirect on success,
							// which useServerFn hands to the router.
							await loginFn({ data: new FormData(event.currentTarget) })
						} catch (err) {
							setError(err instanceof Error ? err.message : 'Login failed')
						} finally {
							setBusy(false)
						}
					}}
				>
					<input type="hidden" name="redirect" value={search.redirect ?? '/quests'} />
					<label className="grid gap-1 text-sm font-semibold">
						Adventurer name
						<input
							name="name"
							required
							minLength={2}
							maxLength={24}
							autoComplete="username"
							className="demo-input"
							placeholder="e.g. Sir Procrastinot"
						/>
					</label>
					<label className="grid gap-1 text-sm font-semibold">
						Passphrase
						<input
							name="passphrase"
							type="password"
							required
							minLength={4}
							autoComplete="current-password"
							className="demo-input"
						/>
					</label>
					{error && <p className="demo-alert demo-alert-danger m-0">{error}</p>}
					<button type="submit" className="demo-button" disabled={busy}>
						{busy ? 'Opening the gates…' : 'Enter the guild'}
					</button>
				</form>
			</section>
		</main>
	)
}
