import { render } from 'solid-js/web'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/solid-router'
import { ListeningRoom } from './room'
import './styles.css'

const rootRoute = createRootRoute()
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: ListeningRoom })
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  defaultNotFoundComponent: () => <main class="not-found"><h1>A little off the beaten path.</h1><p>This room lives over here.</p><a href="/">Back to your collection</a></main>,
})
declare module '@tanstack/solid-router' {
  interface Register { router: typeof router }
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } },
})

render(() => <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>, document.getElementById('root')!)
