import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5181'

// Helper to clear localStorage before navigating
async function setupCleanState(page: Page) {
  await page.goto(BASE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('[data-swapy-slot]', { timeout: 5000 })
}

// Helper to open the profile header dropdown menu
async function openProfileDropdown(page: Page) {
  // The dropdown trigger is the last button in the header action buttons area
  // It's inside the header bar with the profile color background
  const headerBar = page.locator('.text-white')
  const dropdownTrigger = headerBar.locator('button').last()
  await dropdownTrigger.click()
  // Wait for menu to appear
  await page.waitForSelector('[role="menu"]', { timeout: 2000 })
}

// Helper to open header row dropdown menu
async function openHeaderDropdown(page: Page, headerIndex = 0) {
  // Find the header row and click its dropdown button (last button in the row)
  const headerRow = page.locator('[data-testid="header-row"]').nth(headerIndex)
  const dropdownTrigger = headerRow.locator('button').last()
  await dropdownTrigger.click()
  await page.waitForSelector('[role="menu"]', { timeout: 2000 })
}

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should show default profile on first load', async ({ page }) => {
    // Should have exactly one profile button
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(1)

    // Profile header should show "Profile 1"
    await expect(page.getByText('Profile 1')).toBeVisible()
  })

  test('should add a new profile', async ({ page }) => {
    // Click add profile button (the dashed border button with plus icon)
    await page.locator('button.border-dashed').click()

    // Should now have 2 profile buttons
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(2)

    // Profile header should show "Profile 2"
    await expect(page.getByText('Profile 2')).toBeVisible()
  })

  test('should switch between profiles', async ({ page }) => {
    // Add a second profile
    await page.locator('button.border-dashed').click()
    await expect(page.getByText('Profile 2')).toBeVisible()

    // Click first profile button
    await page.locator('[data-swapy-item] button').first().click()
    await expect(page.getByText('Profile 1')).toBeVisible()

    // Click second profile button
    await page.locator('[data-swapy-item] button').nth(1).click()
    await expect(page.getByText('Profile 2')).toBeVisible()
  })

  test('should rename profile via double-click', async ({ page }) => {
    // Double-click on profile name to edit
    const profileName = page.locator('.cursor-pointer').filter({ hasText: 'Profile 1' })
    await profileName.dblclick()

    // Should show input field
    const input = page.locator('input[class*="bg-white"]')
    await expect(input).toBeVisible()

    // Type new name
    await input.fill('My Custom Profile')
    await input.press('Enter')

    // Should show new name
    await expect(page.getByText('My Custom Profile')).toBeVisible()
  })

  test('should duplicate profile', async ({ page }) => {
    // Open dropdown menu
    await openProfileDropdown(page)

    // Click duplicate
    await page.getByRole('menuitem', { name: 'Duplicate profile' }).click()

    // Should have 2 profiles now
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(2)

    // New profile should be named "Profile 1 (Copy)"
    await expect(page.getByText('Profile 1 (Copy)')).toBeVisible()
  })

  test('should delete profile with confirmation', async ({ page }) => {
    // Add a second profile first
    await page.locator('button.border-dashed').click()
    await expect(page.locator('[data-swapy-item] button')).toHaveCount(2)

    // Open dropdown menu
    await openProfileDropdown(page)

    // Click delete
    await page.getByRole('menuitem', { name: 'Delete profile' }).click()

    // Confirm deletion in the alert dialog
    await page.getByRole('button', { name: 'Delete' }).click()

    // Should have 1 profile remaining
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(1)
  })

  test('should always keep at least one profile', async ({ page }) => {
    // Try to delete the only profile
    await openProfileDropdown(page)
    await page.getByRole('menuitem', { name: 'Delete profile' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()

    // Should still have 1 profile (new default created)
    const profileButtons = page.locator('[data-swapy-item] button')
    await expect(profileButtons).toHaveCount(1)
  })

  test('should reorder profiles via drag and drop', async ({ page }) => {
    // Add 2 more profiles
    await page.locator('button.border-dashed').click()
    await page.locator('button.border-dashed').click()

    // Verify we have 3 profiles
    await expect(page.locator('[data-swapy-item] button')).toHaveCount(3)

    // Click first profile to verify it's Profile 1
    await page.locator('[data-swapy-item] button').first().click()
    await expect(page.getByText('Profile 1')).toBeVisible()

    // Drag first profile to last position
    const firstProfile = page.locator('[data-swapy-item] button').first()
    const lastProfile = page.locator('[data-swapy-item] button').last()
    await firstProfile.dragTo(lastProfile)

    // After swap, first position should show a different profile
    await page.locator('[data-swapy-item] button').first().click()
    const headerText = await page.locator('.cursor-pointer').first().textContent()
    expect(headerText).not.toBe('Profile 1')
  })
})

test.describe('Header Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should add a new header', async ({ page }) => {
    // Click ADD button
    await page.getByRole('button', { name: 'ADD' }).click()

    // Should have a header row with inputs
    const headerInputs = page.locator('input[placeholder="Header name"]')
    await expect(headerInputs).toHaveCount(1)
  })

  test('should edit header name and value', async ({ page }) => {
    // Add a header
    await page.getByRole('button', { name: 'ADD' }).click()

    // Fill in header name
    const nameInput = page.locator('input[placeholder="Header name"]')
    await nameInput.fill('Authorization')

    // Fill in header value
    const valueInput = page.locator('input[placeholder="Value"]')
    await valueInput.fill('Bearer token123')

    // Verify values are saved (inputs should have values)
    await expect(nameInput).toHaveValue('Authorization')
    await expect(valueInput).toHaveValue('Bearer token123')
  })

  test('should toggle header enabled state', async ({ page }) => {
    // Add a header
    await page.getByRole('button', { name: 'ADD' }).click()

    // Find the checkbox
    const checkbox = page.locator('button[role="checkbox"]')
    await expect(checkbox).toHaveAttribute('data-state', 'checked')

    await checkbox.click()
    await expect(checkbox).toHaveAttribute('data-state', 'unchecked')

    await checkbox.click()
    await expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  test('should delete a header', async ({ page }) => {
    // Add a header
    await page.getByRole('button', { name: 'ADD' }).click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)

    // Open header dropdown menu
    await openHeaderDropdown(page)

    // Click delete
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    // Header should be gone
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
    await expect(page.getByText('No headers')).toBeVisible()
  })

  test('should duplicate a header', async ({ page }) => {
    // Add a header and fill it
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.locator('input[placeholder="Header name"]').fill('X-Custom')
    await page.locator('input[placeholder="Value"]').fill('custom-value')

    // Open header dropdown menu
    await openHeaderDropdown(page)

    // Click duplicate
    await page.getByRole('menuitem', { name: 'Duplicate' }).click()

    // Should have 2 headers now
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(2)

    // Both should have same values
    const nameInputs = page.locator('input[placeholder="Header name"]')
    await expect(nameInputs.first()).toHaveValue('X-Custom')
    await expect(nameInputs.last()).toHaveValue('X-Custom')
  })

  test('should clear all headers', async ({ page }) => {
    // Add multiple headers
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.getByRole('button', { name: 'ADD' }).click()

    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(3)

    // Click CLEAR button
    await page.getByRole('button', { name: 'CLEAR' }).click()

    // All headers should be gone
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
    await expect(page.getByText('No headers')).toBeVisible()
  })

  test('should add comment to header', async ({ page }) => {
    // Add a header
    await page.getByRole('button', { name: 'ADD' }).click()

    // Fill in comment
    const commentInput = page.locator('input[placeholder="Comment"]')
    await commentInput.fill('This is my auth header')

    await expect(commentInput).toHaveValue('This is my auth header')
  })

  test('should show green indicator when profile has active headers with name', async ({ page }) => {
    // Initially no indicator (no headers)
    await expect(page.locator('[data-swapy-item] .bg-green-500')).not.toBeVisible()

    // Add a header with a name
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.locator('input[placeholder="Header name"]').fill('X-Test')

    // Should show green indicator
    await expect(page.locator('[data-swapy-item] .bg-green-500')).toBeVisible()
  })
})

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should undo adding a header', async ({ page }) => {
    // Find the undo button (first button in header bar that's disabled)
    const headerBar = page.locator('.text-white')
    const undoButton = headerBar.locator('button').first()

    // Initially undo should be disabled
    await expect(undoButton).toBeDisabled()

    // Add a header
    await page.getByRole('button', { name: 'ADD' }).click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)

    // Undo should now be enabled
    await expect(undoButton).not.toBeDisabled()

    // Click undo
    await undoButton.click()

    // Header should be gone
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
  })

  test('should redo after undo', async ({ page }) => {
    const headerBar = page.locator('.text-white')
    const undoButton = headerBar.locator('button').first()
    const redoButton = headerBar.locator('button').nth(3) // redo is 4th button

    // Add a header
    await page.getByRole('button', { name: 'ADD' }).click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)

    // Undo
    await undoButton.click()
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)

    // Redo should be enabled
    await expect(redoButton).not.toBeDisabled()

    // Click redo
    await redoButton.click()

    // Header should be back
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)
  })
})

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should toggle dark mode', async ({ page }) => {
    // Open dropdown menu
    await openProfileDropdown(page)

    // Click dark mode
    await page.getByRole('menuitem', { name: 'Dark mode' }).click()

    // Should have dark class on html
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Open menu again and toggle back
    await openProfileDropdown(page)
    await page.getByRole('menuitem', { name: 'Light mode' }).click()

    // Dark class should be removed
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})

test.describe('Profile-Header Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should keep headers separate between profiles', async ({ page }) => {
    // Add a header to Profile 1
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.locator('input[placeholder="Header name"]').fill('X-Profile-1')
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue('X-Profile-1')

    // Create Profile 2
    await page.locator('button.border-dashed').click()

    // Profile 2 should have no headers
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(0)
    await expect(page.getByText('No headers')).toBeVisible()

    // Add a header to Profile 2
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.locator('input[placeholder="Header name"]').fill('X-Profile-2')

    // Switch back to Profile 1
    await page.locator('[data-swapy-item] button').first().click()

    // Should show Profile 1's header
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue('X-Profile-1')

    // Switch to Profile 2
    await page.locator('[data-swapy-item] button').nth(1).click()

    // Should show Profile 2's header
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue('X-Profile-2')
  })
})

test.describe('Persistence', () => {
  test('should persist data across page reloads', async ({ page }) => {
    // Start with clean state
    await setupCleanState(page)

    // Use a unique identifier for this test run
    const uniqueId = `TestProfile-${Date.now()}`

    // Rename the current profile to something unique
    const profileName = page.locator('.cursor-pointer').filter({ hasText: /Profile/ })
    await profileName.dblclick()
    const input = page.locator('input[class*="bg-white"]')
    await input.fill(uniqueId)
    await input.press('Enter')
    await expect(page.getByText(uniqueId)).toBeVisible()

    // Add a unique header to this profile
    const uniqueHeader = `Header-${Date.now()}`
    await page.getByRole('button', { name: 'ADD' }).click()
    await page.locator('input[placeholder="Header name"]').fill(uniqueHeader)

    // Reload the page (don't clear storage this time)
    await page.reload()
    await page.waitForSelector('[data-swapy-slot]', { timeout: 5000 })

    // Click on the first profile (which should be our renamed profile)
    await page.locator('[data-swapy-item] button').first().click()

    // The unique profile name should still be visible
    await expect(page.getByText(uniqueId)).toBeVisible()

    // The header should still exist with our unique name
    await expect(page.locator('input[placeholder="Header name"]')).toHaveValue(uniqueHeader)
  })
})

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanState(page)
  })

  test('should handle rapid profile creation', async ({ page }) => {
    // Rapidly add 5 profiles
    for (let i = 0; i < 5; i++) {
      await page.locator('button.border-dashed').click()
    }

    // Should have 6 profiles total
    await expect(page.locator('[data-swapy-item] button')).toHaveCount(6)
  })

  test('should handle rapid header creation', async ({ page }) => {
    // Rapidly add 10 headers
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: 'ADD' }).click()
    }

    // Should have 10 headers
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(10)
  })

  test('should handle empty header name gracefully', async ({ page }) => {
    // Add a header but don't fill the name
    await page.getByRole('button', { name: 'ADD' }).click()

    // Should have one header row visible
    await expect(page.locator('input[placeholder="Header name"]')).toHaveCount(1)
  })

  test('should handle profile rename with empty string', async ({ page }) => {
    // Double-click to edit
    await page.locator('.cursor-pointer').filter({ hasText: 'Profile 1' }).dblclick()

    // Clear and submit empty
    const input = page.locator('input[class*="bg-white"]')
    await input.fill('')
    await input.press('Enter')

    // Should keep original name (empty names are rejected)
    await expect(page.getByText('Profile 1')).toBeVisible()
  })

  test('should cancel rename with Escape', async ({ page }) => {
    // Double-click to edit
    await page.locator('.cursor-pointer').filter({ hasText: 'Profile 1' }).dblclick()

    // Type new name but press Escape
    const input = page.locator('input[class*="bg-white"]')
    await input.fill('New Name')
    await input.press('Escape')

    // Wait for input to disappear
    await expect(input).not.toBeVisible()

    // Should keep original name
    await expect(page.getByText('Profile 1')).toBeVisible()
  })
})
