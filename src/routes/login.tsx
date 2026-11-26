import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { signIn, signUp } from '#/functions/auth.functions'

type Mode = 'sign-in' | 'sign-up'

export const Route = createFileRoute('/login')({
	// /login?mode=sign-up&redirect=/quests/abc — parsed and typed. Only
	// same-site relative paths survive, so ?redirect can't leave the site.
	validateSearch: (
		search: Record<string, unknown>,
	): { mode?: Mode; redirect?: string } => ({
		mode: search.mode === 'sign-up' ? 'sign-up' : undefined,
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
	const mode = search.mode ?? 'sign-in'
	const signInFn = useServerFn(signIn)
	const signUpFn = useServerFn(signUp)
	const [error, setError] = useState<string | null>(null)
	const [checkEmail, setCheckEmail] = useState(false)
	const [busy, setBusy] = useState(false)

	if (checkEmail) {
		return (
			<main className="page-wrap px-4 py-12">
				<section className="island-shell mx-auto max-w-md rounded-2xl p-6 text-center sm:p-8">
					<p className="text-5xl">📬</p>
					<h1 className="display-title mt-3 mb-2 text-3xl font-bold">
						Check your inbox
					</h1>
					<p className="demo-muted">
						A raven carries your confirmation link. Click it to enter the guild.
					</p>
				</section>
			</main>
		)
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-md rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">The Guild Hall</p>
				<h1 className="display-title mb-4 text-3xl font-bold">
					{mode === 'sign-in' ? 'Welcome back' : 'Join the guild'}
				</h1>

				<div className="mb-6 flex gap-2" role="tablist">
					{(['sign-in', 'sign-up'] as const).map((m) => (
						<Link
							key={m}
							from={Route.fullPath}
							search={(prev) => ({ ...prev, mode: m === 'sign-up' ? m : undefined })}
							role="tab"
							aria-selected={mode === m}
							onClick={() => setError(null)}
							className={`demo-pill no-underline ${mode === m ? 'outline outline-2 outline-[var(--lagoon)]' : ''}`}
						>
							{m === 'sign-in' ? 'Sign in' : 'Create account'}
						</Link>
					))}
				</div>

				<form
					key={mode}
					className="grid gap-4"
					onSubmit={async (event) => {
						event.preventDefault()
						setBusy(true)
						setError(null)
						const data = new FormData(event.currentTarget)
						try {
							// On success both server fns throw a redirect, which
							// useServerFn hands to the router.
							if (mode === 'sign-in') {
								await signInFn({ data })
							} else {
								const result = await signUpFn({ data })
								if (result?.checkEmail) setCheckEmail(true)
							}
						} catch (err) {
							setError(err instanceof Error ? err.message : 'Something went wrong')
						} finally {
							setBusy(false)
						}
					}}
				>
					<input type="hidden" name="redirect" value={search.redirect ?? '/quests'} />
					{mode === 'sign-up' && (
						<label className="grid gap-1 text-sm font-semibold">
							Adventurer name
							<input
								name="name"
								required
								minLength={2}
								maxLength={24}
								autoComplete="nickname"
								className="demo-input"
								placeholder="e.g. Sir Procrastinot"
							/>
						</label>
					)}
					<label className="grid gap-1 text-sm font-semibold">
						Email
						<input
							name="email"
							type="email"
							required
							autoComplete="email"
							className="demo-input"
						/>
					</label>
					<label className="grid gap-1 text-sm font-semibold">
						Password
						<input
							name="password"
							type="password"
							required
							minLength={8}
							autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
							className="demo-input"
						/>
					</label>
					{error && <p className="demo-alert demo-alert-danger m-0">{error}</p>}
					<button type="submit" className="demo-button" disabled={busy}>
						{busy
							? 'Opening the gates…'
							: mode === 'sign-in'
								? 'Enter the guild'
								: 'Create my adventurer'}
					</button>
				</form>
			</section>
		</main>
	)
}
