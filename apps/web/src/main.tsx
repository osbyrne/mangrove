import { Suspense } from "solid-js";
import { InstallServer } from "./components/InstallServer";
import { render } from "solid-js/web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { ListeningRoom } from "./room";
import * as stylex from "@stylexjs/stylex";
import { styles } from "./styles";

document.documentElement.className =
  stylex.attrs(styles.base, styles.documentRoot).class ?? "";
document.body.className = stylex.attrs(styles.base, styles.body).class ?? "";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Suspense fallback={
      <main {...stylex.attrs(styles.base, styles.installFallback)}>
        <p {...stylex.attrs(styles.base, styles.textReset)} role="status">Connecting to your song server…</p>
        <InstallServer />
      </main>
    }>
      <ListeningRoom />
    </Suspense>
  ),
});
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  defaultNotFoundComponent: () => (
    <main {...stylex.attrs(styles.base, styles.notFound)}>
      <h1
        {...stylex.attrs(styles.base, styles.textReset, styles.notFoundHeading)}
      >
        A little off the beaten path.
      </h1>
      <p
        {...stylex.attrs(
          styles.base,
          styles.textReset,
          styles.notFoundDescription,
        )}
      >
        This room lives over here.
      </p>
      <a
        {...stylex.attrs(
          styles.base,
          styles.tapTarget,
          styles.touchTarget,
          styles.focusRing,
          styles.link,
          styles.notFoundLink,
        )}
        href="/"
      >
        Back to your collection
      </a>
    </main>
  ),
});
declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  ),
  document.getElementById("root")!,
);
