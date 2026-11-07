import { dispatchInputAction, installInputRuntime, registerInputConsumer } from './inputRuntime'

/** No React tree, router, store, projection or save-system dependency. */
export function renderRecoveryScreen(
  container: HTMLElement,
  reload = () => window.location.reload()
) {
  const main = document.createElement('main')
  main.className = 'render-recovery'
  const title = document.createElement('h1')
  title.textContent = 'Containment Protocol'
  const alert = document.createElement('p')
  alert.setAttribute('role', 'alert')
  alert.textContent = 'The application could not display this screen.'
  const explanation = document.createElement('p')
  explanation.textContent =
    'Reload to start the application again. Unsaved changes may be lost. Stored campaign integrity has not been checked by this recovery screen.'
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Reload application'
  button.className = 'render-recovery-action'
  main.append(title, alert, explanation, button)
  container.replaceChildren(main)
  let reloading = false
  let disposeInput = () => {}
  let unregister = () => {}
  const activate = () => {
    if (reloading) return
    reloading = true
    button.disabled = true
    button.textContent = 'Reload requested'
    alert.textContent =
      'Reload requested. If this screen remains, use your browser’s Reload command to try again.'
    disposeInput()
    unregister()
    try {
      reload()
    } catch (error) {
      console.error(error)
      alert.textContent = 'Reload could not start. Use your browser’s Reload command to try again.'
    }
  }
  try {
    unregister = registerInputConsumer({
      id: 'recovery.reload',
      context: 'global',
      available: () => !reloading && button.isConnected,
      execute: activate,
    })
    disposeInput = installInputRuntime()
  } catch {
    // Native activation remains usable if optional device support cannot initialize.
    unregister()
  }
  button.addEventListener('click', () => {
    if (!dispatchInputAction('recovery.reload')) activate()
  })
  button.focus()
  return () => {
    disposeInput()
    unregister()
  }
}
