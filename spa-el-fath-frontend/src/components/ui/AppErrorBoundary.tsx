import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/** Prevent an unexpected render exception from leaving a blank application screen. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the developer console without exposing details to users.
    console.error('SPA EL FATH interface rendering error:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="login-page">
          <section className="login-card" role="alert">
            <h1>Something went wrong</h1>
            <p>The page could not be displayed. Reload the application and try again.</p>
            <button className="button button-primary" onClick={() => window.location.reload()}>
              Reload application
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
