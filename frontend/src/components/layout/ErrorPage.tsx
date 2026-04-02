import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom"

export default function ErrorPage() {
    const error = useRouteError()

    let errorMessage = "An unexpected error occurred."

    if (isRouteErrorResponse(error)) {
        errorMessage = error.status === 404 ? "404 Not Found" : error.statusText
    } else if (error instanceof Error) {
        errorMessage = error.message
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="bg-white dark:bg-gray-900 shadow rounded-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-800">
                <h1 className="text-4xl font-bold text-red-500 mb-4">Oops!</h1>
                <p className="text-gray-700 dark:text-gray-300 mb-6 font-medium">
                    {errorMessage}
                </p>
                <Link
                    to="/chat"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                    Return to Chat
                </Link>
            </div>
        </div>
    )
}
