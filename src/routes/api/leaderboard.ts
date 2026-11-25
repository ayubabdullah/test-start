import { createFileRoute } from '@tanstack/react-router'
import { leaderboard } from '#/server/quests.server'

/** Public JSON endpoint: GET /api/leaderboard */
export const Route = createFileRoute('/api/leaderboard')({
	server: {
		handlers: {
			GET: async () => {
				const rows = await leaderboard()
				return Response.json(
					rows.map(({ name, xp }) => ({
						name,
						xp: xp.points,
						level: xp.level,
						title: xp.title,
					})),
					{ headers: { 'Cache-Control': 'public, max-age=10' } },
				)
			},
		},
	},
})
