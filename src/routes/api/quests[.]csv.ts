import { createFileRoute } from '@tanstack/react-router'
import { apiAuth } from '#/middleware/auth'
import { listQuestsFor, toCsv } from '#/server/quests.server'

/**
 * GET /api/quests.csv — the `[.]` in the filename escapes the dot so the
 * URL keeps its file extension. Returns a downloadable spreadsheet.
 */
export const Route = createFileRoute('/api/quests.csv')({
	server: {
		middleware: [apiAuth],
		handlers: {
			GET: async ({ context }) => {
				const csv = toCsv(await listQuestsFor(context.user, { sort: 'oldest' }))
				const date = new Date().toISOString().slice(0, 10)
				return new Response(csv, {
					headers: {
						'Content-Type': 'text/csv; charset=utf-8',
						'Content-Disposition': `attachment; filename="questlog-${date}.csv"`,
						'Cache-Control': 'private, no-store',
					},
				})
			},
		},
	},
})
