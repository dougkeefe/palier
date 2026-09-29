"use client";

import "@palier/ui/tokens.css";
import "@palier/ui/components.css";
import "./globals.css";

import { GlobalErrorDocument } from "../components/errors/GlobalErrorDocument";

// The root layout itself failed (architecture.md §16, progress.md D141).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <GlobalErrorDocument error={error} retry={retry} />;
}
