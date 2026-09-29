"use client";

import { RouteError } from "../../components/errors/RouteError";

// A route that threw, caught inside the app's layout (architecture.md §16, progress.md D141).
export default function RouteErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}
