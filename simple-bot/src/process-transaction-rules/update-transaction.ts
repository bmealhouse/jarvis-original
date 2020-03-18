import * as puppeteer from 'puppeteer'
import {TransactionUpdate} from '../../types'
import {goalSettingsById} from '../config/simple-goals'
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

    try {
      const saveButton = await page.waitForSelector(
        '.field-alert-transition-group button',
        {timeout: 1000},
      )

      // do not remember this transaction edit
      console.log('  selecting do not remember this transaction edit…')
      await page.click('input#remember-edit-no')

      // click save button
      console.log('  clicking the save button…')
      await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle0'}),
        saveButton.click(),
      ])
    } catch {}

    // wait for transaction to refresh
    console.log('  waiting for transaction to refresh…')
    await page.waitForSelector('.transactions-refresh-notice', {
      hidden: true,
    })
  }

  if (applyGoal) {
    // click change goal button
    console.log('  clicking change goal button…')
    await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle0'}),
      page.click(`.change-option a[href*="${transaction.uuid}/goal"]`),
    ])

    // filter categories by text
    console.log('  waiting for goals filter text box…')
    const goalsFilterTextBox = await page.waitForSelector(
      '.sidebar-filtered-list input[type="text"]',
    )
    console.log('  typing text to filter by…')
    await goalsFilterTextBox.type(goalSettingsById[applyGoal].filterText)

    // select first goal in the filtered list
    console.log('  selecting first category in the filted list…')
    await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle0'}),
      page.click('.amounts-list button'),
    ])

    // wait for transaction to refresh
    console.log('  waiting for transaction to refresh…')
    await page.waitForSelector('.transactions-refresh-notice', {
      hidden: true,
    })
  }

  if (applyMemo !== undefined) {
    // click change memo button
    let changeMemoButton = null
    try {
      changeMemoButton = await page.waitForSelector(
        '.sidebar-main > div > div:nth-child(7) button',
        {visible: true, timeout: 1000},
      )
      console.log('  clicking change memo button…')
      await changeMemoButton.click()
    } catch {}

    if (!changeMemoButton) {
      try {
        changeMemoButton = await page.waitForSelector(
          '.sidebar-main > div > div:nth-child(6) button',
          {visible: true, timeout: 1000},
        )
        console.log('  clicking change memo button…')
        await changeMemoButton.click()
      } catch {}
    }

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

    // wait for memo to change
    console.log('  waiting for memo to save…')
    await page.waitForSelector('button[type="submit"]', {
      hidden: true,
    })

    // wait for transaction to refresh
    console.log('  waiting for transaction to refresh…')
    await page.waitForSelector('.transactions-refresh-notice', {
      hidden: true,
    })
  }
}
