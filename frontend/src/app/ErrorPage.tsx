import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom"

export default function ErrorPage() {
    const error = useRouteError()

    let errorMessage = "An unexpected error occurred."

    if (isRouteErrorResponse(error)) {
        errorMessage = error.status === 404 ? "404 Not Found" : error.statusText
    } else if (error instanceof Error) {
        errorMessage = error.message
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-white to-slate-300 p-4">
            <div className="bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Oops!</h1>
                <p className="text-gray-600 mb-6">{errorMessage}</p>
                <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-all hover:scale-[1.02]"
                >
                    Return Home
                </Link>
            </div>
        </div>
    )
}
