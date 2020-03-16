import * as puppeteer from 'puppeteer'

export default async (
  page: puppeteer.Page,
  selector: string,
): Promise<void> => {
  await page.click(selector, {clickCount: 3})
  await page.keyboard.press('Backspace')
}
