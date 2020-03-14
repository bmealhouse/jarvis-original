import {config} from 'dotenv'
import puppeteer from 'puppeteer'
import inquirer from 'inquirer'
import {TransactionUpdate} from '../types'
import Goals from './config/simple-goals'
import Rules from './config/simple-rules'
import transactions from './config/simple-transactions'
import {updateTransaction} from './utils'

config()

const dryRun = true

main()
async function main(): Promise<void> {
  try {
    let pageTransition = null

    const browser = await puppeteer.launch({
      devtools: true,
      headless: false,
      slowMo: 50,
      defaultViewport: {
        width: 1280,
        height: 1000,
      },
    })

    const page = await browser.newPage()

    if (!dryRun) {
      await page.goto('https://signin.simple.com', {waitUntil: 'networkidle0'})
      await page.waitForSelector('#login')

      console.log('Logging in to simple.com…')
      await page.type('#login_username', process.env.SIMPLE_USERNAME!)
      await page.type('#login_password', process.env.SIMPLE_PASSWORD!)
      pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
      await page.click('#signin-btn')
      await pageTransition

      // prompt for verification code
      const {verificationCode} = await inquirer.prompt([
        {name: 'verificationCode', message: 'Verification code:'},
      ])

      await page.waitForSelector('#login-2fa')

      console.log('Entering verification code…')
      await page.type('#login-2fa input[name="pin"]', verificationCode)
      pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
      await page.click('#login-2fa button[type="submit"]')
      await pageTransition

      console.log('Waiting for successful login…')
      await page.waitForSelector('.balances')

      // let transactions = []
      // page.on('requestfinished', async request => {
      //   const url = request.url()
      //   if (url.includes('/transactions-gather')) {
      //     const response = request.response()
      //     if (response.ok()) {
      //       transactions = await response.json()
      //     }
      //   }
      // })

      console.log('Filtering activity by all time…')
      await page.click('.filter-expand')
      await page.select('.time-span-options > select', 'all')
      await page.waitForSelector('main:not(.-loading)')
    }

    console.log('Processing transactions…')

    const transactionUpdates: TransactionUpdate[] = []
    for (const transaction of transactions) {
      const {
        amounts: {amount},
        categories: [category, ...otherCategories],
        description,
        goal_id: goalId,
        raw_description: rawDescription,
        memo = '',
        times: {when_recorded_local: recordedLocalTime},
      } = transaction

      // check if transaction has other categories
      if (otherCategories && otherCategories.length > 0) {
        console.log(
          '  found transaction with other categories:',
          otherCategories,
        )
      }

      // check if transaction should be skipped
      if (memo.includes('#skip') || memo.includes('#todo')) {
        continue
      }

      // find rules based on transaction description text
      const [, rules] =
        Object.entries(Rules).find(
          ([text]) =>
            description.toUpperCase().includes(text) ||
            rawDescription.toUpperCase().includes(text),
        ) ?? []

      // when no rules are found, ensure the todo memo has been appended
      if (!rules) {
        transactionUpdates.push({applyMemo: '#todo', transaction})
        continue
      }

      // find rule based on where condition (if applicable)
      const rule = rules.find(rule => {
        if (rule.amountEquals) {
          return amount === rule.amountEquals
        }

        if (rule.amountGreaterThan) {
          return amount > rule.amountGreaterThan
        }

        if (rule.amountLessThan) {
          return amount < rule.amountLessThan
        }

        if (rule.recordedAfter) {
          const recordedDate = new Date(recordedLocalTime)
          const recordedYear = recordedDate.getFullYear()

          let afterDate = new Date(rule.recordedAfter)
          if (rule.recordedAfter.split('/').length === 2) {
            afterDate = new Date(`${rule.recordedAfter}/${recordedYear}`)
          }

          return recordedDate > afterDate
        }

        if (rule.recordedBetween) {
          const recordedDate = new Date(recordedLocalTime)
          const recordedYear = recordedDate.getFullYear()

          const [start, end] = rule.recordedBetween

          let startDate = new Date(start)
          if (start.split('/').length === 2) {
            startDate = new Date(`${start}/${recordedYear}`)
          }

          let endDate = new Date(end)
          if (end.split('/').length === 2) {
            endDate = new Date(`${end}/${recordedYear}`)
          }

          return recordedDate > startDate && recordedDate < endDate
        }

        return true
      })

      // when no rule is found, ensure the todo memo has been appended
      if (!rule) {
        transactionUpdates.push({applyMemo: '#todo', transaction})
        continue
      }

      const transactionUpdate: TransactionUpdate = {
        transaction,
      }

      // does the category name match the rule's category
      if (rule.applyCategory !== category.name) {
        transactionUpdate.applyCategory = rule.applyCategory
      }

      // does the goal ID match the rule's goal (optional)
      if (rule.applyGoal && rule.applyGoal !== goalId) {
        transactionUpdate.applyGoal = rule.applyGoal
      }

      // does the memo include rule's memo text (optional)
      if (rule.applyMemo && memo !== rule.applyMemo) {
        transactionUpdate.applyMemo = rule.applyMemo
      }

      // only apply updates to transactions that have changes
      if (Object.keys(transactionUpdate).length > 1) {
        transactionUpdates.push(transactionUpdate)
      }
    }

    if (dryRun) {
      showDryRun(transactionUpdates)
      await browser.close()
      return
    }

    const [first, second] = transactionUpdates
    const updates = [first, second]

    await Promise.all(
      updates.map(async update => updateTransaction(page, update)),
    )

    // console.log('Processing transactions…')
    // await page.$$eval('.transaction', transaction => {
    //   console.log({transaction})
    // })
  } catch (error) {
    console.error(error.toString())
  }
}

function showDryRun(transactionUpdates: TransactionUpdate[]): void {
  let skip = 0

  for (const {transaction, ...updates} of transactionUpdates) {
    if (skip > 0) {
      skip -= 1
      continue
    }

    const {
      amounts: {amount},
      associated_goal_info: {name: associatedGoal = ''} = {},
      categories: [category],
      description,
      memo = '',
      times: {when_recorded_local: recordedLocalTime},
    } = transaction

    console.log(
      `\n${recordedLocalTime} ${description} ($${amount / 100 / 100})`,
    )

    if (updates.applyCategory) {
      console.log(
        `   Update category: ${category.name} >>> ${updates.applyCategory}`,
      )
    } else {
      console.log(`   Category: ${category.name}`)
    }

    if (updates.applyGoal) {
      if (associatedGoal) {
        console.log(
          `   Update goal: ${associatedGoal} >>> ${
            Goals.LookupById[updates.applyGoal]
          } (ensure this is working)`,
        )
      } else {
        console.log(`   Apply goal: ${Goals.LookupById[updates.applyGoal]}`)
      }
    } else if (associatedGoal) {
      console.log(`   Goal: ${associatedGoal}`)
    }

    if (updates.applyMemo) {
      console.log(`   Apply memo: ${updates.applyMemo}`)
    } else if (memo) {
      console.log(`   Memo: ${memo} (ensure this is working)`)
    }
  }
}
