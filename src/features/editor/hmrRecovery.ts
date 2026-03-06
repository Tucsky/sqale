interface HmrContext {
  on: (event: 'vite:beforeUpdate', callback: () => void) => void
}

interface LocationLike {
  reload: () => void
}

/**
 * Forces a full reload on hot updates to keep Fabric canvas internals and Vue state in sync.
 */
export function registerHmrCanvasRecovery(hot: HmrContext | undefined, location: LocationLike): void {
  if (!hot) {
    return
  }

  hot.on('vite:beforeUpdate', () => {
    location.reload()
  })
}
