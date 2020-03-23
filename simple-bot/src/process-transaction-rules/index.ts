import * as chalk from 'chalk'
import {Simple} from '../../types'
import bootstrapProgram from '../bootstrap-program'
import outputDryRun from './output-dry-run'
import processTransactions from './process-transactions'
import updateTransaction from './update-transaction'

bootstrapProgram(async ({browser, page}) => {
  if (!browser || !page) {
    console.log('Processing transactions…')
    outputDryRun(processTransactions())
    return
  }

  let transactions: Simple.Transaction[] = []
  page.on('requestfinished', async request => {
    const url = request.url()
    if (url.includes('/transactions-gather')) {
      const response = request.response()
      if (response?.ok()) {
        transactions = (await response.json()) as Simple.Transaction[]
      }
    }
  })

  console.log('Filtering activity by all time…')
  await page.click('.filter-expand')
  await page.select('.time-span-options > select', 'all')
  await page.waitForSelector('main:not(.-loading)')

  let currentPage = 1
  const stopAtPage = 11
  let numberOfPagingArrows
  console.log('Processing transactions…')

  do {
    while (transactions.length === 0) {
      // eslint-disable-next-line no-await-in-loop
      await page.waitFor(100)
    }

    const transactionUpdates = processTransactions(transactions)
    for (const update of transactionUpdates) {
      // eslint-disable-next-line no-await-in-loop
      await updateTransaction(page, update)
    }

    transactions = []

    if (currentPage >= stopAtPage) {
      break
    }

    console.log(
      `\n${chalk.bgMagenta.black(` Navigating to page ${currentPage + 1}… `)}`,
    )

    try {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle0'}),
        page.click('.transactions-paging li:last-of-type'),
      ])
    } catch (error) {
      console.log(chalk.redBright(` error: ${String(error.message)}`))
    }

    currentPage += 1

    // eslint-disable-next-line no-await-in-loop
    await page.waitFor(500)

    try {
      // eslint-disable-next-line no-await-in-loop
      await page.waitForSelector('.transactions-paging .paging-arrow', {
        visible: true,
      })
    } catch (error) {
      console.log(chalk.redBright(` error: ${String(error.message)}`))
    }

    // eslint-disable-next-line no-await-in-loop
    numberOfPagingArrows = await page.$$eval(
      '.transactions-paging .paging-arrow',
      pagingArrows => pagingArrows.length,
    )
  } while (numberOfPagingArrows !== 1)

  console.log('\nDone.')
})
