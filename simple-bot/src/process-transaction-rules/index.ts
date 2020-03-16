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

  console.log('Processing transactions…')
  const transactionUpdates = processTransactions(transactions)
  for (const update of transactionUpdates) {
    // eslint-disable-next-line no-await-in-loop
    await updateTransaction(page, update)
  }
})
