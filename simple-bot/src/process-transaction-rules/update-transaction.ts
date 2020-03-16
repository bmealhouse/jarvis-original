import * as puppeteer from 'puppeteer'
import {TransactionUpdate} from '../../types'
import clearText from './clear-text'

export default async (
  page: puppeteer.Page,
  {applyCategory, applyGoal, applyMemo, transaction}: TransactionUpdate,
): Promise<void> => {
  const amount = transaction.amounts.amount / 100 / 100
  console.log(
    `${transaction.times.when_recorded_local} ${transaction.description} ($${amount})…`,
  )

  // click transaction
  await Promise.all([
    page.waitForNavigation({waitUntil: 'networkidle0'}),
    page.click(`[data-transaction-id="${transaction.uuid}"]`),
  ])

  if (applyCategory) {
    // click change category button
    console.log('  clicking change category button…')
    await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle0'}),
      page.click(`.change-option a[href*="${transaction.uuid}/category"]`),
    ])

    // filter categories by text
    console.log('  waiting for categories filter text box…')
    const categoriesFilterTextBox = await page.waitForSelector(
      '.sidebar-filtered-list input[type="text"]',
    )
    console.log('  typing text to filter by…')
    await categoriesFilterTextBox.type(applyCategory)

    // select first category in the filtered list
    console.log('  selecting first category in the filted list…')
    await page.click('.amounts-list button')

    // do not remember this transaction edit
    console.log('  selecting do not remember this transaction edit…')
    await page.click('input#remember-edit-no')

    // click save button
    console.log('  clicking the save button…')
    await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle0'}),
      page.click('.field-alert-transition-group button'),
    ])
  }

  if (applyGoal) {
    // click change goal button
    const changeGoalButton = null

    console.log('apply goal')
  }

  if (applyMemo !== undefined) {
    // click change memo button
    console.log('  clicking change memo button…')
    await page.click('.sidebar-main > div > div:nth-child(7) button')

    // type memo text
    console.log('  clearing the memo text box…')
    await clearText(page, '#memo')
    if (applyMemo.length > 0) {
      console.log('  typing in the new memo text…')
      await page.type('#memo', applyMemo)
    }

    // click save button
    console.log('  clicking save button…')
    await page.click('button[type="submit"]')
  }
}

// TimeoutError: waiting for selector ".change-option a[href*="ba25500a-d7f7-3713-b14a-2b05ca5151b2/category"]" failed: timeout 30000ms exceeded
// Error: No node found for selector: .sidebar-filtered-list input[type="text"]
