import { createFileRoute } from '@tanstack/react-router'
import { apiAuth } from '#/middleware/auth'
import { findQuest, removeQuest, toggleQuest } from '#/server/quests.server'

/**
 * GET    /api/quests/:questId   → one quest
 * PATCH  /api/quests/:questId   → toggle done / not done
 * DELETE /api/quests/:questId   → abandon the quest
 *
 * Route-level middleware applies to every handler below.
 */
export const Route = createFileRoute('/api/quests/$questId')({
	server: {
		middleware: [apiAuth],
		handlers: {
			GET: async ({ params, context }) => {
				const quest = await findQuest(context.user, params.questId)
				return quest
					? Response.json(quest)
					: Response.json({ error: 'Quest not found' }, { status: 404 })
			},
			PATCH: async ({ params, context }) => {
				const quest = await toggleQuest(context.user, params.questId)
				return quest
					? Response.json(quest)
					: Response.json({ error: 'Quest not found' }, { status: 404 })
			},
			DELETE: async ({ params, context }) => {
				const removed = await removeQuest(context.user, params.questId)
				return removed
					? new Response(null, { status: 204 })
					: Response.json({ error: 'Quest not found' }, { status: 404 })
			},
		},
	},
})
