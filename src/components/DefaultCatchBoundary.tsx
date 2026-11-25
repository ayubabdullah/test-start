import {
	type ErrorComponentProps,
	Link,
	rootRouteId,
	useMatch,
	useRouter,
} from '@tanstack/react-router'

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
	const router = useRouter()
	const isRoot = useMatch({
		strict: false,
		select: (state) => state.id === rootRouteId,
	})

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">A trap was sprung 🪤</p>
				<h1 className="display-title mb-3 text-3xl font-bold">
					Something went wrong
				</h1>
				<p className="demo-alert demo-alert-danger">
					{error instanceof Error ? error.message : String(error)}
				</p>
				<div className="mt-5 flex flex-wrap gap-3">
					<button
						type="button"
						className="demo-button"
						onClick={() => {
							reset()
							router.invalidate()
						}}
					>
						Try again
					</button>
					{isRoot ? (
						<Link to="/" className="demo-button demo-button-secondary">
							Home
						</Link>
					) : (
						<button
							type="button"
							className="demo-button demo-button-secondary"
							onClick={() => window.history.back()}
						>
							Go back
						</button>
					)}
				</div>
			</section>
		</main>
	)
}
