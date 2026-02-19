import { expect, test } from '@playwright/test'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import { pathToFileURL } from 'url'

async function launchApp(homeDir: string): Promise<{ app: ElectronApplication; page: Page }> {
  const rendererFile = path.resolve(process.cwd(), 'dist/renderer/index.html')
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE

  const app = await electron.launch({
    args: ['.'],
    env: {
      ...env,
      MMO_CLAW_HOME: homeDir,
      ELECTRON_RENDERER_URL: pathToFileURL(rendererFile).toString(),
      CI: '1',
    },
  })

  const page = await app.firstWindow()
  await expect(page.getByTestId('app-title')).toHaveText('MMO Claw')

  return { app, page }
}

test.describe('Electron app smoke flow', () => {
  let app: ElectronApplication
  let page: Page
  let testHomeDir: string

  test.beforeEach(async ({}, testInfo) => {
    testHomeDir = path.join(
      os.tmpdir(),
      'mmo-claw-e2e',
      `${testInfo.project.name}-${testInfo.title.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}`
    )
    await fs.ensureDir(testHomeDir)
    const launched = await launchApp(testHomeDir)
    app = launched.app
    page = launched.page
  })

  test.afterEach(async () => {
    if (app) {
      await app.close()
    }
    await fs.remove(testHomeDir)
  })

  test('creates and deletes a workspace', async () => {
    await page.getByTestId('workspace-name-input').fill('E2E Workspace')
    await page.getByTestId('create-workspace-button').click()
    await expect(page.getByTestId('workspace-list')).toContainText('E2E Workspace')
    await expect(page.getByTestId('status-message')).toContainText('created')

    const row = page.locator('[data-testid^="workspace-item-"]').filter({ hasText: 'E2E Workspace' }).first()
    await row.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByTestId('workspace-list')).not.toContainText('E2E Workspace')
    await expect(page.getByTestId('status-message')).toContainText('deleted')
  })

  test('saves settings and enqueues a task', async () => {
    await page.getByTestId('workspace-name-input').fill('Runner')
    await page.getByTestId('create-workspace-button').click()
    await expect(page.getByTestId('workspace-list')).toContainText('Runner')

    await page.getByTestId('settings-concurrency-input').fill('4')
    await page.getByTestId('save-settings-button').click()
    await expect(page.getByTestId('status-message')).toContainText('Settings saved')

    await page.getByTestId('enqueue-actor-input').fill('bulk-downloader')
    await page.getByTestId('enqueue-input-json').fill('{"url":"https://example.com"}')
    await page.getByTestId('enqueue-button').click()
    await expect(page.getByTestId('queue-result')).toContainText('Task ID:')
  })
})
