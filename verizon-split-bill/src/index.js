import axios from 'axios'
import puppeteer from 'puppeteer'
import currency from './currency'
import splitBill from './split-bill'
import sendEmail from './send-email'

const VZW_VIEWPAYBILL_URL = 'https://login.verizonwireless.com/vzauth/UI/Login'
const VZW_API_BASEURL =
  'https://myvpostpay.verizonwireless.com/ui/bill/data/ao/digital'

main()
async function main() {
  try {
    let pageTransition = null

    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage()
    await page.goto(VZW_VIEWPAYBILL_URL, {waitUntil: 'networkidle0'})
    await page.waitForSelector('#login-form')

    console.log('Logging in to verizonwireless.com...')
    await page.type('#IDToken1', process.env.VZW_USERNAME)
    await page.type('#IDToken2', process.env.VZW_PASSWORD)
    pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
    await page.click('#login-submit')
    await pageTransition

    try {
      await page.waitForSelector('#challengequestion')

      console.log('Answering security question...')
      await page.type('#IDToken1', process.env.VZW_SECRET_ANSWER)
      await page.click('#rememberComputer') // uncheck rememeber me checkbox
      pageTransition = page.waitForNavigation({waitUntil: 'networkidle0'})
      await page.click('#otherButton')
      await pageTransition
    } catch {}

    console.log('Waiting for successful login...')
    await page.waitForSelector('#quickUpdatesSection')

    console.log('Fetching summary data...')
    const {balanceText, billDate} = await fetchSummaryData(browser)

    console.log('Fetching bill details...')
    const {totalAmount, planAmount, lineLevelDetails} = await fetchBillDetails(
      browser,
      billDate,
    )

    await browser.close()

    const bill = splitBill({
      balanceText,
      totalAmount: currency(totalAmount),
      planAmount: currency(planAmount),
      lineLevelDetails,
    })

    console.log('Fetching quote of the day...')
    const quoteOfTheDay = await fetchQuoteOfTheDay()
    await sendEmail({bill, quoteOfTheDay})
  } catch (error) {
    console.error(error.toString())
  }
}

async function fetchSummaryData(browser) {
  const summaryTab = await browser.newPage()
  await summaryTab.goto(`${VZW_API_BASEURL}/summary`, {
    waitUntil: 'networkidle0',
  })

  const {
    summary: {
      data: {CURRENT_BILLING_FULL_MONTH, curBillDate},
      cq: {balanceTxt},
    },
  } = JSON.parse(await summaryTab.$eval('pre', el => el.textContent))

  const billDate = new Date(curBillDate)
  const [month, date, year] = [
    CURRENT_BILLING_FULL_MONTH,
    billDate.getDate(),
    billDate.getFullYear(),
  ]

  return {
    balanceText: balanceTxt,
    billDate: {month, date, year},
  }
}

async function fetchBillDetails(browser, billDate) {
  const detailsTab = await browser.newPage()
  await detailsTab.goto(
    `${VZW_API_BASEURL}/details?stmtDate=${billDate.month}+${billDate.date},+${billDate.year}`,
  )

  const {
    data: {
      bill: {total},
      accountSummaryDetails: [{value: planAmount}],
      lineLevelDetails,
    },
  } = JSON.parse(await detailsTab.$eval('pre', el => el.textContent))

  return {
    totalAmount: total,
    planAmount,
    lineLevelDetails,
  }
}

async function fetchQuoteOfTheDay() {
  const res = await axios.get('http://quotes.rest/qod.json?category=inspire')
  return res.data.contents.quotes[0]
}
