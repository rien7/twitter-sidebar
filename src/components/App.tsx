import { SidebarSurface } from '@/components/sidebar/SidebarSurface'
import { MediaOverlayProvider } from '@/context/mediaOverlay'

function App() {
  return (
    <MediaOverlayProvider>
      <SidebarSurface />
    </MediaOverlayProvider>
  )
}

export default App
