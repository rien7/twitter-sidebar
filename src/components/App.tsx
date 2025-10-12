import { MediaOverlayProvider } from '@/components/mediaOverlayProvider'
import { SidebarSurface } from '@/components/sidebar/SidebarSurface'

function App() {
  return (
    <MediaOverlayProvider>
      <SidebarSurface />
    </MediaOverlayProvider>
  )
}

export default App
