import axios from 'axios'
import puppeteer from 'puppeteer'
import currency from './currency'
import splitBill from './split-bill'
import sendEmail from './send-email'

const VZW_VIEWPAYBILL_URL = 'https://login.verizonwireless.com/vzauth/UI/Login'

main()
async function main() {
  try {
    const browser = await puppeteer.launch({headless: false, devtools: true})
    const page = await browser.newPage()
    await page.goto(VZW_VIEWPAYBILL_URL, {waitUntil: 'networkidle0'})
    await page.waitForSelector('#login-form')

    let summaryResponse = null
    let detailsResponse = null

    page.on('requestfinished', async request => {
      const url = request.url()
      if (url.includes('/summary') || url.includes('/details')) {
        const response = request.response()
        if (response && response.ok()) {
          const json = await response.json()
          if (url.includes('/summary')) {
            summaryResponse = json
          } else if (url.includes('/details')) {
            detailsResponse = json
          }
        }
      }
    })

    console.log('Logging in to verizonwireless.com…')
    await page.type('#IDToken1', process.env.VZW_USERNAME)
    await page.type('#IDToken2', process.env.VZW_PASSWORD)
    await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle0'}),
      page.click('#login-submit'),
    ])

    try {
      await page.waitForSelector('#challengequestion')

      console.log('Answering security question…')
      await page.type('#IDToken1', process.env.VZW_SECRET_ANSWER)
      await page.click('#rememberComputer') // uncheck rememeber me checkbox
      await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle0'}),
        page.click('#otherButton'),
      ])
    } catch {}

    console.log('Waiting for successful login…')
    await page.waitForSelector('[sitecat-cta="View bill"]')

    console.log('Viewing bill…')
    await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle0'}),
      page.click('[sitecat-cta="View bill"]'),
    ])

    const WAIT_DURATION = 100
    const MAX_DURATION = 5000

    let totalDuration = 0
    while (
      totalDuration <= MAX_DURATION &&
      // eslint-disable-next-line no-unmodified-loop-condition
      (summaryResponse === null || detailsResponse === null)
    ) {
      totalDuration += WAIT_DURATION
      await page.waitFor(WAIT_DURATION) // eslint-disable-line no-await-in-loop
    }

    console.log('Parsing summary data…')
    const {
      summary: {
        cq: {balanceTxt: balanceText},
      },
    } = summaryResponse

    console.log('Parsing bill details…')
    const {
      data: {
        bill: {total: totalAmount},
        accountSummaryDetails,
        lineLevelDetails,
      },
    } = detailsResponse

    const {value: planAmount} = accountSummaryDetails.find(
      detail => detail.header.toLowerCase() === 'account charges',
    )

    await browser.close()

    const bill = splitBill({
      balanceText,
      totalAmount: currency(totalAmount),
      planAmount: currency(planAmount),
      lineLevelDetails,
    })

    console.log('Fetching quote of the day…')
    const quoteOfTheDay = await fetchQuoteOfTheDay()
    await sendEmail({bill, quoteOfTheDay})
  } catch (error) {
    console.error(error.toString())
  }
}

async function fetchQuoteOfTheDay() {
  const response = await axios.get(
    'http://quotes.rest/qod.json?category=inspire',
  )

  return response.data.contents.quotes[0]
}
