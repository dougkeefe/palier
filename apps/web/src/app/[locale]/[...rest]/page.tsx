import { notFound } from "next/navigation";

// Routes an unknown path to `[locale]/not-found.tsx`, so it gets the localised 404 inside the
// app's layout rather than Next's default (progress.md D141).
export default function UnknownPath() {
  notFound();
}
