import { createFileRoute } from '@tanstack/react-router'
import { parseNewQuest, parseQuestSearch } from '#/lib/quests'
import { apiAuth } from '#/middleware/auth'
import { addQuest, listQuestsFor } from '#/server/quests.server'

/**
 * GET  /api/quests?status=active&sort=xp&q=dragon   → your quests
 * POST /api/quests  { title, notes, difficulty }    → create a quest
 *
 * `createHandlers` lets each method pick its own middleware: OPTIONS is
 * public while GET/POST require a session cookie.
 */
export const Route = createFileRoute('/api/quests')({
	server: {
		handlers: ({ createHandlers }) =>
			createHandlers({
				OPTIONS: () =>
					new Response(null, {
						status: 204,
						headers: { Allow: 'GET, POST, OPTIONS' },
					}),
				GET: {
					middleware: [apiAuth],
					handler: async ({ request, context }) => {
						const url = new URL(request.url)
						const search = parseQuestSearch(
							Object.fromEntries(url.searchParams),
						)
						return Response.json(await listQuestsFor(context.user, search), {
							headers: { 'Cache-Control': 'private, no-store' },
						})
					},
				},
				POST: {
					middleware: [apiAuth],
					handler: async ({ request, context }) => {
						try {
							const input = parseNewQuest(await request.json())
							const quest = await addQuest(context.user, input)
							return Response.json(quest, { status: 201 })
						} catch (error) {
							return Response.json(
								{ error: error instanceof Error ? error.message : 'Bad request' },
								{ status: 400 },
							)
						}
					},
				},
			}),
	},
})
