/**
 * Shared responsive class contracts for popups and dialogs.
 * They keep overlay surfaces within the viewport and provide an internal scroll path on short screens.
 */
export const VIEWPORT_BOUNDED_POPUP_CLASS
  = 'max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-x-hidden overflow-y-auto'

export const MOBILE_DIALOG_SURFACE_CLASS
  = 'fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 grid max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-auto gap-4 overflow-y-auto border bg-background p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'

export const DESKTOP_DIALOG_SURFACE_CLASS
  = 'sm:left-1/2 sm:top-1/2 sm:w-full sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6'
