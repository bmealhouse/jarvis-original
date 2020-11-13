import puppeteer from 'puppeteer'
import inquirer from 'inquirer'
import clipboardy from 'clipboardy'

main()
async function main() {
  try {
    let pageTransition

    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage()
    await page.goto('https://www.eftps.com/eftps')
    await page.goto('https://www.eftps.com/eftps/payments/home', {
      waitUntil: 'networkidle0',
    })

    await page.waitForSelector('[value="Login"]')

    console.log('Logging in to eftps.com…')
    await page.type('[name="EIN1"]', process.env.EFTPS_EIN1)
    await page.type('[name="EIN2"]', process.env.EFTPS_EIN2)
    await page.type('[name="PIN"]', process.env.EFTPS_PIN)
    await page.type('[name="password"]', process.env.EFTPS_PASSWORD)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('[value="Login"]')
    await pageTransition

    await page.waitForSelector('[value="next"]')

    console.log('Entering form 941…')
    await page.type('#TaxForm_EditField', '941')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('[value="next"]')
    await pageTransition

    await page.waitForSelector('[value="next"]')

    console.log('Selecting federal tax deposit…')
    await page.click('[value="5"]')
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('[value="next"]')
    await pageTransition

    const {paymentAmount, taxPeriod, year} = await inquirer.prompt([
      {name: 'paymentAmount', message: 'Payment amount (EFTPS):'},
      {
        type: 'list',
        name: 'taxPeriod',
        message: 'Tax period:',
        choices: ['Q1', 'Q2', 'Q3', 'Q4'],
      },
      {name: 'year', message: 'Year:'},
    ])

    await page.waitForSelector('[name="singlePayment.amount.value"]')

    console.log('Entering business tax payment info…')
    await page.type(
      '[name="singlePayment.amount.value"]',
      formatCurrency(paymentAmount),
    )
    await page.select(
      '[name="singlePayment.taxPeriodMonth"]',
      {Q1: '3', Q2: '6', Q3: '9', Q4: '12'}[taxPeriod],
    )
    await page.type('[name="singlePayment.taxPeriodYear"]', year)

    console.log('Selecting settlement date…')
    await page.click('.ui-datepicker-trigger')
    await page.click(
      '.ui-datepicker-calendar td:not(.ui-datepicker-unselectable)',
    )

    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('[value="next"]')
    await pageTransition

    const {socialSecurity, medicare, taxWithholding} = await inquirer.prompt([
      {name: 'socialSecurity', message: 'Social security:'},
      {name: 'medicare', message: 'Medicare:'},
      {name: 'taxWithholding', message: 'Tax withholding:'},
    ])

    await page.waitForSelector(
      '[name="singlePayment.subCategories[0].amount.value"]',
    )

    console.log('Entering sub category amounts…')
    await page.type(
      '[name="singlePayment.subCategories[0].amount.value"]',
      formatCurrency(socialSecurity),
    )
    await page.type(
      '[name="singlePayment.subCategories[1].amount.value"]',
      formatCurrency(medicare),
    )
    await page.type(
      '[name="singlePayment.subCategories[2].amount.value"]',
      formatCurrency(taxWithholding),
    )
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('[value="next"]')
    await pageTransition

    await page.waitForSelector('[value="makePayment"]')

    console.log('Validating payment information…')
    if (
      (await isExactAmount(page, 'Payment Amount', paymentAmount)) &&
      (await isExactAmount(page, 'Social Security', socialSecurity)) &&
      (await isExactAmount(page, 'Medicare', medicare)) &&
      (await isExactAmount(page, 'Tax Withholding', taxWithholding))
    ) {
      console.log('Scheduling payment…')
      pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
      await page.click('[value="makePayment"]')
      await pageTransition

      await page.waitForSelector('[value="printerFriendly"]')

      console.log('Navigating to printer friendly version…')
      await page.click('[value="printerFriendly"]')
    } else {
      console.log('  something’s not quite right…')
    }

    const month = String(new Date().getMonth() || 12).padStart(2, '0')
    const filename = `${year}-${month} EFTPS Deposit`

    console.log('Copying filename to clipboard…')
    console.log(` > ${filename}`)
    await clipboardy.write(filename)
  } catch (error) {
    console.error(error.toString())
  }
}

function formatCurrency(value) {
  return value.replace(/[$,]/g, '')
}

async function isExactAmount(page, sectionText, amount) {
  const amountConfirmation = await page.$$eval(
    '.formContainer tr',
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
