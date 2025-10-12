import './polyfills/process'

import { ensureSidebar } from './components'
import { registerBridgeMessageHandler } from './handlers/bridgeMessageHandler'
import { registerGlobalClickInterceptor } from './handlers/globalClickHandler'
import { registerSidebarEventHandler } from './handlers/sidebarEventHandler'
import { ensureInterceptInjected } from './interceptor/inject'

ensureInterceptInjected()

registerBridgeMessageHandler()
registerSidebarEventHandler()
registerGlobalClickInterceptor()

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type !== 'childList') return
    if (mutation.addedNodes.length === 0) return
    mutation.addedNodes.forEach((node) => {
      if ((node as HTMLElement).id === 'react-root') {
        ensureSidebar()
        observer.disconnect()
      }
    })
  })
})

observer.observe(document, { childList: true, subtree: true })
