import { expect, test } from '@playwright/test'

test('live site serves the energy landing and opens the full menu', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /더 나은 내일/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '전기요금 절감 확인하기' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '전체 메뉴', exact: true }).click()
  await expect(page.locator('.menu-dialog')).toBeVisible()
  await page
    .locator('.menu-dialog')
    .getByRole('button', { name: '대시보드', exact: true })
    .click()
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(errors).toEqual([])
})
