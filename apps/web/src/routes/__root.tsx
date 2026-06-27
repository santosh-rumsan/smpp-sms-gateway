import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const TanStackDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-devtools').then((m) => ({
        default: m.TanStackDevtools,
      })),
    )
  : () => null

const TanStackRouterDevtoolsPanel = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtoolsPanel,
      })),
    )
  : () => null

import appCss from '../styles.css?url'

const queryClient = new QueryClient()

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'SMPP SMS Gateway' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <React.Suspense>
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </React.Suspense>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f0f0f0] px-6 text-center">
      <div className="rounded-2xl bg-white p-10">
        <h1 className="text-2xl font-black text-[#1a1a1a]">Page not found</h1>
        <p className="mt-1 text-sm text-gray-400">
          The page you requested does not exist.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-accent-500 hover:text-accent-600"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
