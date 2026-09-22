import { expect, test } from '@playwright/test'

test('live site serves the simple start screen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /바꾸면 얼마나 줄어들까요/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '고지서·엑셀 올리기' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '전문 기능', exact: true }).click()
  await expect(page.locator('.eb-drawer')).toBeVisible()
  expect(errors).toEqual([])
})
