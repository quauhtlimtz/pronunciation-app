import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <p className="text-base mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message || "Unknown error"}</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                this.setState({ error: null });
                window.location.href = "/";
              }}
            >
              Go home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
