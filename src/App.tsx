import { Button } from "@/components/ui/button";

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="max-w-xl text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Client-only PDF editor
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal">
          PDF Editor
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Project foundation is ready. The upload and editor workspace come
          next.
        </p>
        <Button className="mt-6" type="button" disabled>
          Setup complete
        </Button>
      </section>
    </main>
  );
}

export default App;
