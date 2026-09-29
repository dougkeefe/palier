import { NotFoundView } from "../../components/errors/NotFoundView";

// A `notFound()` under a locale (progress.md D141). Unknown paths render the same view through
// `[...rest]`, which Next serves inside the layout.
export default function NotFound() {
  return <NotFoundView titled />;
}
