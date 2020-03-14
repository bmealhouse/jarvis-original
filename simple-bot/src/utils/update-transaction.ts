import puppeteer from 'puppeteer'
import {TransactionUpdate} from '../../types'
import clearText from './clear-text'

export default async (
  page: puppeteer.Page,
  {applyCategory, applyGoal, applyMemo, transaction}: TransactionUpdate,
): Promise<void> => {
  // click transaction
  await page.click(`[data-transaction-id="${transaction.uuid}"]`)

  if (applyCategory) {
    // click change category button
    const changeCategoryButton = await page.waitForSelector(
      `.change-option a[href*="${transaction.uuid}/category"]`,
    )
    await changeCategoryButton.click()

    // filter categories by text
    await page.type('.sidebar-filtered-list input[type="text"]', applyCategory)

    // select first category in the filtered list
    await page.click('.amounts-list button')

    // do not remember this transaction edit
    await page.click('input#remember-edit-no')

    // click save button
    await page.click('.field-alert-transition-group button')
  }

  if (applyGoal) {
    // click change goal button
    const changeGoalButton = null

    console.log('apply goal')
  }

  if (applyMemo) {
    // click change memo button
    const changeMemoButton = await page.waitForSelector(
      '.sidebar-main > div > div:nth-child(7) button',
    )
    await changeMemoButton.click()

    // type memo text
    await clearText(page, '#memo')
    await page.type('#memo', applyMemo)

    // click save button
    await page.click('button[type="submit"]')
  }
}

// TimeoutError: waiting for selector ".change-option a[href*="ba25500a-d7f7-3713-b14a-2b05ca5151b2/category"]" failed: timeout 30000ms exceeded
// Error: No node found for selector: .sidebar-filtered-list input[type="text"]
