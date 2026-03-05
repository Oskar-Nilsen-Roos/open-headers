import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5181'

// Navigate to app with clean localStorage
async function setupCleanState(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.goto(BASE_URL)
  await page.waitForSelector('[data-swapy-slot]')
}

// Helper to click the "Add profile" button in the sidebar
async function addProfile(page: Page) {
  await page.getByTestId('add-profile').click()
}

// Helper to open the sidebar "More actions" dropdown menu
async function openSidebarMenu(page: Page) {
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.waitForSelector('[role="menu"]')
}

// Helper to get the profile name text element
function profileName(page: Page, name: string | RegExp) {
  return page.locator('.profile-header .cursor-pointer').filter({ hasText: name })
}

// Helper to get the rename input
function renameInput(page: Page) {
  return page.getByTestId('profile-name-input')
}

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should show default profile on first load', async ({ page }) => {
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(1)
    await expect(profileName(page, 'Profile 1')).toBeVisible()
  })

  test('should add a new profile', async ({ page }) => {
    await addProfile(page)
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(2)
    await expect(profileName(page, 'Profile 2')).toBeVisible()
  })

  test('should switch between profiles', async ({ page }) => {
    await addProfile(page)
    await expect(profileName(page, 'Profile 2')).toBeVisible()

    await page.locator('[data-swapy-item] button').first().click()
    await expect(profileName(page, 'Profile 1')).toBeVisible()

    await page.locator('[data-swapy-item] button').nth(1).click()
    await expect(profileName(page, 'Profile 2')).toBeVisible()
  })

  test('should rename profile via double-click', async ({ page }) => {
    await profileName(page, 'Profile 1').dblclick()
    const input = renameInput(page)
    await expect(input).toBeVisible()
    await input.fill('My Custom Profile')
    await input.press('Enter')
    await expect(page.getByText('My Custom Profile')).toBeVisible()
  })

  test('should duplicate profile', async ({ page }) => {
    await openSidebarMenu(page)
    await page.getByRole('menuitem', { name: 'Duplicate profile' }).click()
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(2)
    await expect(profileName(page, 'Profile 1 (Copy)')).toBeVisible()
  })

  test('should open profile menu', async ({ page }) => {
    await openSidebarMenu(page)
    await expect(page.getByRole('menuitem', { name: 'Duplicate profile' })).toBeVisible()
  })

  test('should delete profile with confirmation', async ({ page }) => {
    await addProfile(page)
    await expect(page.locator('[data-swapy-item] button')).toHaveCount(2)

    await openSidebarMenu(page)
    await page.getByRole('menuitem', { name: 'Delete profile' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()

    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(1)
  })

  test('should always keep at least one profile', async ({ page }) => {
    await openSidebarMenu(page)
    await page.getByRole('menuitem', { name: 'Delete profile' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()

    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(1)
  })

  test('should reorder profiles via drag and drop', async ({ page }) => {
    await addProfile(page)
    await addProfile(page)
    await expect(page.locator('[data-swapy-item] button')).toHaveCount(3)

    await page.locator('[data-swapy-item] button').first().click()
    await expect(profileName(page, 'Profile 1')).toBeVisible()

    const firstProfile = page.locator('[data-swapy-item] button').first()
    const lastProfile = page.locator('[data-swapy-item] button').last()
    await firstProfile.dragTo(lastProfile)

    await page.locator('[data-swapy-item] button').first().click()
    const headerText = await page.locator('.profile-header .cursor-pointer').first().textContent()
    expect(headerText).not.toBe('Profile 1')
  })
})

test.describe('Header Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should add a new header', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    const headerInputs = page.locator('input[placeholder="Header name"]')
    await expect(headerInputs).toHaveCount(1)
  })

  test('should edit header name and value', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    const nameInput = page.locator('input[placeholder="Header name"]')
    await nameInput.fill('Authorization')
    const valueInput = page.locator('input[placeholder="Value"]')
    await valueInput.fill('Bearer token123')
    await expect(nameInput).toHaveValue('Authorization')
    await expect(valueInput).toHaveValue('Bearer token123')
  })

  test('should toggle header enabled state', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    const headerRow = page.getByTestId('header-row').first()
    const checkbox = headerRow.locator('[role="checkbox"]')
    // New headers default to disabled
    await expect(checkbox).toHaveAttribute('data-state', 'unchecked')
    await checkbox.click()
    await expect(checkbox).toHaveAttribute('data-state', 'checked')
    await checkbox.click()
    await expect(checkbox).toHaveAttribute('data-state', 'unchecked')
  })

  test('should delete a header', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)

    const headerRow = page.locator('[data-testid="header-row"]').first()
    await headerRow.getByRole('button', { name: 'Delete' }).click()

    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
  })

  test('should show header row action buttons', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    const headerRow = page.locator('[data-testid="header-row"]').first()
    await expect(headerRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(headerRow.getByRole('button', { name: 'Duplicate' })).toBeVisible()
  })

  test('should duplicate a header', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    await page.locator('input[placeholder="Header name"]').fill('X-Custom')
    await page.locator('input[placeholder="Value"]').fill('custom-value')

    const headerRow = page.locator('[data-testid="header-row"]').first()
    await headerRow.getByRole('button', { name: 'Duplicate' }).click()

    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(2)
    const nameInputs = page.locator('input[placeholder="Header name"]')
    await expect(nameInputs.first()).toHaveValue('X-Custom')
    await expect(nameInputs.last()).toHaveValue('X-Custom')
  })

  test('should clear all headers', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    await page.getByTestId('footer-add').click()
    await page.getByTestId('footer-add').click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(3)

    await page.getByTestId('footer-clear').click()

    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
  })

  test('should add comment to header', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    const commentInput = page.locator('input[placeholder="Comment"]')
    await commentInput.fill('This is my auth header')
    await expect(commentInput).toHaveValue('This is my auth header')
  })
})

test.describe('URL Filter Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should show url filter row action buttons', async ({ page }) => {
    await page.getByRole('tab', { name: 'URL filters' }).click()
    await page.getByTestId('footer-add').click()

    const filterRow = page.locator('[data-testid="url-filter-row"]').first()
    await expect(filterRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(filterRow.getByRole('button', { name: 'Duplicate' })).toBeVisible()
  })
})

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should undo adding a header', async ({ page }) => {
    const headerBar = page.locator('.profile-header')
    const undoButton = headerBar.getByRole('button', { name: 'Undo' })

    await expect(undoButton).toBeDisabled()

    await page.getByTestId('footer-add').click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)
    await expect(undoButton).not.toBeDisabled()

    await undoButton.click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
  })

  test('should redo after undo', async ({ page }) => {
    const headerBar = page.locator('.profile-header')
    const undoButton = headerBar.getByRole('button', { name: 'Undo' })
    const redoButton = headerBar.getByRole('button', { name: 'Redo' })

    await page.getByTestId('footer-add').click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)

    await undoButton.click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
    await expect(redoButton).not.toBeDisabled()

    await redoButton.click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)
  })
})

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should toggle dark mode', async ({ page }) => {
    await openSidebarMenu(page)
    await page.locator('button[aria-label="Dark"]').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Theme buttons don't close the dropdown, so Light is still visible
    await page.locator('button[aria-label="Light"]').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})

test.describe('Profile-Header Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should keep headers separate between profiles', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    await page.locator('input[placeholder="Header name"]').fill('X-Profile-1')
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue('X-Profile-1')

    await addProfile(page)

    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)

    await page.getByTestId('footer-add').click()
    await page.locator('input[placeholder="Header name"]').fill('X-Profile-2')

    await page.locator('[data-swapy-item] button').first().click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue('X-Profile-1')

    await page.locator('[data-swapy-item] button').nth(1).click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue('X-Profile-2')
  })
})

test.describe('Persistence', () => {
  test('should persist data across page reloads', async ({ page }) => {
    // Don't use addInitScript here — it would clear localStorage on reload too
    await page.goto(BASE_URL)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('[data-swapy-slot]')

    const uniqueId = `TestProfile-${Date.now()}`

    await profileName(page, /Profile/).dblclick()
    const input = renameInput(page)
    await input.fill(uniqueId)
    await input.press('Enter')
    await expect(page.getByText(uniqueId)).toBeVisible()

    const uniqueHeader = `Header-${Date.now()}`
    await page.getByTestId('footer-add').click()
    const nameInput = page.locator('input[placeholder="Header name"]')
    await nameInput.fill(uniqueHeader)
    await nameInput.blur()

    // Reload without clearing localStorage
    await page.reload()
    await page.waitForSelector('[data-swapy-slot]')

    await page.locator('[data-swapy-item] button').first().click()
    await expect(page.getByText(uniqueId)).toBeVisible()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue(uniqueHeader)
  })
})

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should handle rapid profile creation', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await addProfile(page)
    }
    await expect(page.locator('[data-swapy-item] button')).toHaveCount(6)
  })

  test('should handle rapid header creation', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('footer-add').click()
    }
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(10)
  })

  test('should handle empty header name gracefully', async ({ page }) => {
    await page.getByTestId('footer-add').click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)
  })

  test('should handle profile rename with empty string', async ({ page }) => {
    await profileName(page, 'Profile 1').dblclick()
    const input = renameInput(page)
    await input.fill('')
    await input.press('Enter')
    await expect(profileName(page, 'Profile 1')).toBeVisible()
  })

  test('should cancel rename with Escape', async ({ page }) => {
    await profileName(page, 'Profile 1').dblclick()
    const input = renameInput(page)
    await input.fill('New Name')
    await input.press('Escape')
    await expect(input).not.toBeVisible()
    await expect(profileName(page, 'Profile 1')).toBeVisible()
  })
})
