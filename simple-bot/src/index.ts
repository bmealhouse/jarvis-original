import fs from 'fs'
import path from 'path'
import {config} from 'dotenv'
import puppeteer from 'puppeteer'
import inquirer from 'inquirer'
import outputDryRun from './output-dry-run'
import {updateTransaction} from './utils'
import processTransactions from './process-transactions'

config()

const dryRun = false

main()
async function main(): Promise<void> {
  try {
    if (dryRun) {
      console.log('Processing transactions…')
      outputDryRun(processTransactions())
      return
    }

    const now = new Date()
    const [year, month, date, hours, minutes] = [
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    ]

    const startTimestamp = `${year}-${month + 1}-${date}-${hours}-${minutes}`

    const rootDir = path.join(__dirname, '..')
    const files = await fs.promises.readdir(rootDir)
    const lockoutFile = files.find(file => file.includes('.lockout'))

    if (lockoutFile) {
      return
    }

    const browser = await puppeteer.launch({
      devtools: true,
      headless: false,
      slowMo: 75,
      defaultViewport: {
        width: 1280,
        height: 1000,
      },
    })

    let pageTransition = null

    const page = await browser.newPage()
    await page.goto('https://signin.simple.com', {waitUntil: 'networkidle0'})
    await page.waitForSelector('#login')

    console.log('Logging in to simple.com…')
    await page.type('#login_username', process.env.SIMPLE_USERNAME!)
    await page.type('#login_password', process.env.SIMPLE_PASSWORD!)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#signin-btn')
    await pageTransition

    try {
      await page.waitForSelector('#login-2fa', {timeout: 2500})
    } catch {
      await browser.close()
      console.log('Too many login attempts…')
      await fs.promises.writeFile(`${startTimestamp}.lockout`, '', 'utf8')
      return
    }

    // prompt for verification code
    const {verificationCode} = await inquirer.prompt([
      {name: 'verificationCode', message: 'Verification code:'},
    ])

    console.log('Entering verification code…')
    await page.type('#login-2fa input[name="pin"]', verificationCode)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#login-2fa button[type="submit"]')
    await pageTransition

    console.log('Waiting for successful login…')
    await page.waitForSelector('.balances')

    // let transactions: Simple.Transaction[] = []
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

    console.log('Processing transactions…')
    const transactionUpdates = processTransactions()
    const [first, second] = transactionUpdates
    for (const update of [first, second]) {
      // eslint-disable-next-line no-await-in-loop
      await updateTransaction(page, update)
    }
  } catch (error) {
    console.error(error.toString())
  }
}
