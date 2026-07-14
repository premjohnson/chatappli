import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import Providers from "./providers"
import { MediaViewer } from "../features/message/components/media/MediaViewer"

function App() {

  return (
    <Providers>
      <RouterProvider router={router} />
      <MediaViewer />
    </Providers>
  )

}

export default App