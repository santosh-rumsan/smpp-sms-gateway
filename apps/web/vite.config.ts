import net from 'node:net'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

async function getAvailablePort(preferredPort: number) {
  const reservePort = (port: number) =>
    new Promise<number>((resolve, reject) => {
      const server = net.createServer()
      server.unref()
      server.once('error', reject)
      server.listen(port, () => {
        const address = server.address()
        const resolvedPort =
          typeof address === 'object' && address ? address.port : port
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve(resolvedPort)
        })
      })
    })

  try {
    return await reservePort(preferredPort)
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === 'EADDRINUSE'
    ) {
      return reservePort(0)
    }
    throw error
  }
}

const config = defineConfig(async ({ command }) => {
  const isBuild = command === 'build'
  const devtoolsEventBusPort = isBuild ? 42069 : await getAvailablePort(42069)
  const plugins = [
    nitro(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ]

  if (!isBuild) {
    plugins.unshift(
      devtools({
        eventBusConfig: {
          port: devtoolsEventBusPort,
        },
      }),
    )
  }

  return {
    plugins,
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
  }
})

export default config
