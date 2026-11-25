import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function NotFound({ children }: { children?: ReactNode }) {
	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 text-center sm:p-10">
				<p className="text-6xl">🗺️</p>
				<h1 className="display-title mt-3 mb-2 text-3xl font-bold">
					Off the edge of the map
				</h1>
				<div className="demo-muted mb-6">
					{children ?? 'Here be dragons. This page does not exist.'}
				</div>
				<Link to="/" className="demo-button">
					Return to the village
				</Link>
			</section>
		</main>
	)
}
