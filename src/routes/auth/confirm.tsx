import { createFileRoute } from '@tanstack/react-router'
import { confirmEmail } from '#/functions/auth.functions'

/**
 * Landing page for the link in Supabase's confirmation email:
 *   /auth/confirm?token_hash=…&type=signup&next=/quests
 *
 * The visitor arrives with a full page load, so this beforeLoad runs on the
 * server; the server fn verifies the token, writes the session cookies and
 * throws a redirect. If verification fails, the error boundary renders.
 */
export const Route = createFileRoute('/auth/confirm')({
	validateSearch: (search: Record<string, unknown>) => ({
		token_hash: typeof search.token_hash === 'string' ? search.token_hash : '',
		type: typeof search.type === 'string' ? search.type : '',
		next: typeof search.next === 'string' ? search.next : undefined,
	}),
	beforeLoad: ({ search }) =>
		confirmEmail({
			data: { tokenHash: search.token_hash, type: search.type, next: search.next },
		}),
	head: () => ({ meta: [{ title: 'Confirming… · QuestBoard' }] }),
})
