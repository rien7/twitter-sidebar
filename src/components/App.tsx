import { MediaOverlayProvider } from "@/components/mediaOverlayProvider";
import { SidebarSurface } from "@/components/sidebar/SidebarSurface";

const App = () => (
  <MediaOverlayProvider>
    <SidebarSurface />
  </MediaOverlayProvider>
);

export default App;
