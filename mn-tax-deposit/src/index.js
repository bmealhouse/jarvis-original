import puppeteer from 'puppeteer'
import inquirer from 'inquirer'
import clipboardy from 'clipboardy'

main()
async function main() {
  try {
    let pageTransition

    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage()
    await page.goto('https://www.mndor.state.mn.us/tp/eservices/_/', {
      waitUntil: 'networkidle0',
    })

    await page.waitForSelector('#d-8')

    console.log('Logging in to mndor.state.mn.us...')
    await page.type('#d-6', process.env.MNDOR_USERNAME)
    await page.type('#d-7', process.env.MNDOR_PASSWORD)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#d-8')
    await pageTransition

    await page.waitForSelector('#c-8')

    console.log('Sending text message...')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#c-8')
    await pageTransition

    // prompt for verification code
    const {verificationCode} = await inquirer.prompt([
      {name: 'verificationCode', message: 'Verification code:'},
    ])

    await page.waitForSelector('#c-o')

    console.log('Entering verification code...')
    await page.type('#c-m', verificationCode)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#c-o')
    await pageTransition

    await page.waitForSelector('#l_y-1-1')

    console.log('Navigating to manage payments...')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#l_y-1-1')
    await pageTransition

    await page.waitForSelector('#l_g-1-1')

    console.log('  for a specific account...')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#l_g-1-1')
    await pageTransition

    await page.waitForSelector('#c-7')

    console.log('Selecting withholding tax account...')
    await page.click('#c-7')
    await page.select('#c-7', 'WTH')

    await page.waitForSelector('#c-s tbody > tr')

    const filingPeriods = await page.$$eval('#c-s .CellDate a', cellDates =>
      cellDates.map(el => ({id: el.id, text: el.textContent})),
    )

    const {filingPeriod} = await inquirer.prompt([
      {
        type: 'list',
        name: 'filingPeriod',
        message: 'Filing period:',
        choices: filingPeriods.map(({text}) => text),
      },
    ])

    const selectedFilingPeriod = filingPeriods.find(
      ({text}) => text === filingPeriod,
    )

    console.log(`Selecting ${selectedFilingPeriod.text}...`)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click(`#${selectedFilingPeriod.id}`)
    await pageTransition

    await page.waitForSelector('#l_m-1-2')

    console.log('Navigating to make a payment...')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#l_m-1-2')
    await pageTransition

    await page.waitForSelector('#l_c-a-4')

    console.log('Navigating to withholding deposit...')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#l_c-a-4')
    await pageTransition

    const {paymentAmount} = await inquirer.prompt([
      {name: 'paymentAmount', message: 'Payment amount:'},
    ])

    await page.waitForSelector('#c-2')

    console.log('Entering payment amount...')
    await page.type('#c-x1', paymentAmount)
    await page.type('#c-y1', paymentAmount)
    await page.click('.ActionBarBottom .ActionButtonSubmit')

    await page.waitForSelector('.ConfirmationDialog')

    console.log('Validating summary of payment...')
    if (await isExactAmount(page, 'Payment Amount', paymentAmount)) {
      // WIP
      // console.log('Confirming summary of payment...')
      // pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
      // await page.click('.ModalActionBar .ActionButton:first-child')
      // await pageTransition
      // await page.waitForSelector('.ActionButtonMN_PF')
      // console.log('Navigating to printer friendly version...')
      // pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
      // await page.click('.ActionButtonMN_PF')
      // await pageTransition
    } else {
      console.log("  something's not quite right...")
    }

    const month = String(new Date().getMonth() || 12).padEnd(2, '0')
    const [_date, _month, year] = selectedFilingPeriod.text.split('-')
    await clipboardy.write(`${year}-${month} MN Tax Deposit.pdf`)
  } catch (error) {
    console.error(error.toString())
  }
}

async function isExactAmount(page, sectionText, amount) {
  const amountConfirmation = await page.$$eval(
    '.ConfirmationMessage tr',
    (tableRows, sectionTextArg) => {
      const {textContent} = tableRows.find(row =>
        row.textContent.includes(sectionTextArg),
      )
      return textContent.slice(textContent.indexOf('$')).trim()
    },
    sectionText,
  )

  return amount === amountConfirmation
}
