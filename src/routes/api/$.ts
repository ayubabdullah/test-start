import { createFileRoute } from '@tanstack/react-router'

const ENDPOINTS = [
	'GET    /api/leaderboard',
	'GET    /api/quests?status=all|active|done&sort=newest|oldest|xp&q=',
	'POST   /api/quests',
	'GET    /api/quests/:questId',
	'PATCH  /api/quests/:questId',
	'DELETE /api/quests/:questId',
	'GET    /api/quests.csv',
]

/** Splat route: catches every unknown /api/* path with a JSON 404. */
export const Route = createFileRoute('/api/$')({
	server: {
		handlers: {
			ANY: ({ params }) =>
				Response.json(
					{ error: `No endpoint at /api/${params._splat}`, endpoints: ENDPOINTS },
					{ status: 404 },
				),
		},
	},
})
