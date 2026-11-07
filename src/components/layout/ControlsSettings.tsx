import { activeBindings, bindingLabel, INPUT_ACTIONS } from '../../app/inputActions'
import {
  clearInputBinding,
  saveInputPreferences,
  startInputCapture,
  useInputPreferences,
} from '../../app/inputRuntime'

export function ControlsSettings() {
  const { preferences, capture, message } = useInputPreferences()
  return (
    <section aria-label="Controls" className="controls-settings space-y-4 my-4">
      <h3 className="text-lg font-semibold">Controls</h3>
      <div className="controls-feedback">
        <p role="status">{message}</p>
        {capture && (
          <button type="button" className="btn" onClick={() => startInputCapture(null)}>
            Cancel capture
          </button>
        )}
      </div>
      <p>
        Keyboard shortcuts use Alt + Shift and physical US key positions, regardless of the printed
        letters. Standard controllers use button numbers 0–16. Native buttons work with mouse, touch
        and assistive activation. Tab, Enter, Space and Escape retain their usual behavior.
      </p>
      <p>
        Shortcuts pause while typing and background actions pause while a dialog is open. Connect a
        standard controller and press a button to enable it. Unsupported controllers fall back to
        the native buttons.
      </p>
      {INPUT_ACTIONS.map((action) => (
        <fieldset key={action.id} className="space-y-2">
          <legend className="font-semibold">{action.label}</legend>
          {(['keyboard', 'controller'] as const).map((device) => {
            const bindings = activeBindings(preferences, action.id).filter(
              (binding) => binding.device === device
            )
            return (
              <div key={device} className="space-y-2">
                <p>
                  {device === 'keyboard' ? 'Keyboard' : 'Controller'}:{' '}
                  {bindings.length
                    ? bindings.map(bindingLabel).join(' or ')
                    : 'Unassigned; native button remains available.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn"
                    aria-pressed={capture?.id === action.id && capture.device === device}
                    onClick={() => startInputCapture({ id: action.id, device })}
                  >
                    Change {action.label.toLowerCase()} {device}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={!bindings.length}
                    onClick={() => clearInputBinding(action.id, device)}
                  >
                    Clear {action.label.toLowerCase()} {device}
                  </button>
                </div>
              </div>
            )
          })}
        </fieldset>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => saveInputPreferences({ version: 1, overrides: {} })}
      >
        Reset all controls to defaults
      </button>
    </section>
  )
}
