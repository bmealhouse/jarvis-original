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
    const changeCategoryButton = `.change-option a[href*="${transaction.uuid}/category"]`
    await page.waitForSelector(changeCategoryButton)
    await page.click(changeCategoryButton)

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
    console.log('apply goal')
  }

  if (applyMemo) {
    // click change memo button
    await page.click('.sidebar-main > div > div:nth-child(7) button')

    // type memo text
    await clearText(page, '#memo')
    await page.type('#memo', applyMemo)

    // click save button
    await page.click('button[type="submit"]')
  }
}
