import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled app error", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return <AppErrorFallback error={this.state.error} />;
  }
}

function AppErrorFallback({ error }: { error: Error }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-workspace px-4 text-workspace-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            App error
          </p>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The editor could not open this view. This can happen when local
            project data uses an older format.
          </p>
        </div>

        <pre className="mt-4 max-h-28 overflow-auto rounded-md border border-border bg-muted p-2 text-xs whitespace-pre-wrap text-muted-foreground">
          {error.message}
        </pre>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={handleReturnHome}>
            Return home
          </Button>
        </div>
      </section>
    </main>
  );
}

function handleReturnHome() {
  window.location.assign("/");
}
