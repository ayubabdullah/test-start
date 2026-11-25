import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

/**
 * Pathless layout route (the `_` prefix adds no URL segment). Every route
 * inside src/routes/_authed/ inherits this guard.
 *
 * This is navigation UX only — each private server function also enforces
 * auth through the `requireUser` middleware.
 */
export const Route = createFileRoute('/_authed')({
	beforeLoad: ({ context, location }) => {
		if (!context.user) {
			throw redirect({ to: '/login', search: { redirect: location.href } })
		}
		// Narrow the type for children: `context.user` is non-null below here.
		return { user: context.user }
	},
	component: Outlet,
})
