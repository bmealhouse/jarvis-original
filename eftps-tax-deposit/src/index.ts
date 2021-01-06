import { config } from "dotenv";
import * as puppeteer from "puppeteer";
import * as inquirer from "inquirer";
import * as clipboardy from "clipboardy";

config();
void main();

async function main() {
  try {
    const browser = await puppeteer.launch({
      devtools: false,
      headless: false,
      slowMo: 25,
      defaultViewport: {
        width: 1280,
        height: 960,
      },
    });

    const page = await browser.newPage();
    await page.goto("https://www.eftps.com/eftps");
    await page.goto("https://www.eftps.com/eftps/payments/home", {
      waitUntil: "networkidle0",
    });

    await page.waitForSelector('[value="Login"]');

    console.log("Logging in to eftps.com…");
    await page.type('[name="EIN1"]', process.env.EFTPS_EIN1!);
    await page.type('[name="EIN2"]', process.env.EFTPS_EIN2!);
    await page.type('[name="PIN"]', process.env.EFTPS_PIN!);
    await page.type('[name="password"]', process.env.EFTPS_PASSWORD!);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('[value="Login"]'),
    ]);

    await page.waitForSelector('[value="next"]');

    console.log("Entering form 941…");
    await page.type("#TaxForm_EditField", "941");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('[value="next"]'),
    ]);

    await page.waitForSelector('[value="next"]');

    console.log("Selecting federal tax deposit…");
    await page.click('[value="5"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('[value="next"]'),
    ]);

    type PaymentAnswers = {
      paymentAmount: string;
      taxPeriod: "Q1" | "Q2" | "Q3" | "Q4";
      year: string;
    };

    const {
      paymentAmount,
      taxPeriod,
      year,
    } = await inquirer.prompt<PaymentAnswers>([
      { name: "paymentAmount", message: "Payment amount (EFTPS):" },
      {
        type: "list",
        name: "taxPeriod",
        message: "Tax period:",
        choices: ["Q1", "Q2", "Q3", "Q4"],
      },
      { name: "year", message: "Year:" },
    ]);

    await page.waitForSelector('[name="singlePayment.amount.value"]');

    console.log("Entering business tax payment info…");
    await page.type(
      '[name="singlePayment.amount.value"]',
      formatCurrency(paymentAmount)
    );
    await page.select(
      '[name="singlePayment.taxPeriodMonth"]',
      { Q1: "3", Q2: "6", Q3: "9", Q4: "12" }[taxPeriod]
    );
    await page.type('[name="singlePayment.taxPeriodYear"]', year);

    console.log("Selecting settlement date…");
    await page.click(".ui-datepicker-trigger");
    await page.click(
      ".ui-datepicker-calendar td:not(.ui-datepicker-unselectable)"
    );

    await page.waitForTimeout(250);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('[value="next"]'),
    ]);

    type SubCategoryAmountAnswers = {
      socialSecurity: string;
      medicare: string;
      taxWithholding: string;
    };

    const {
      socialSecurity,
      medicare,
      taxWithholding,
    } = await inquirer.prompt<SubCategoryAmountAnswers>([
      { name: "socialSecurity", message: "Social security:" },
      { name: "medicare", message: "Medicare:" },
      { name: "taxWithholding", message: "Tax withholding:" },
    ]);

    await page.waitForSelector(
      '[name="singlePayment.subCategories[0].amount.value"]'
    );

    console.log("Entering sub category amounts…");
    await page.type(
      '[name="singlePayment.subCategories[0].amount.value"]',
      formatCurrency(socialSecurity)
    );
    await page.type(
      '[name="singlePayment.subCategories[1].amount.value"]',
      formatCurrency(medicare)
    );
    await page.type(
      '[name="singlePayment.subCategories[2].amount.value"]',
      formatCurrency(taxWithholding)
    );
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('[value="next"]'),
    ]);

    await page.waitForSelector('[value="makePayment"]');

    console.log("Validating payment information…");
    if (
      await isValid(page, {
        paymentAmount,
        socialSecurity,
        medicare,
        taxWithholding,
      })
    ) {
      console.log("Scheduling payment…");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.click('[value="makePayment"]'),
      ]);

      await page.waitForSelector('[value="printerFriendly"]');

      console.log("Navigating to printer friendly version…");
      await page.click('[value="printerFriendly"]');
    } else {
      console.log("  something’s not quite right…\n");
    }

    const month = String(new Date().getMonth() || 12).padStart(2, "0");
    const filename = `${year}-${month} EFTPS Deposit`;

    console.log("Copying filename to clipboard…");
    console.log(` > ${filename}`);
    await clipboardy.write(filename);
  } catch (error: unknown) {
    console.error(error);
  }
}

function formatCurrency(value: string) {
  return value.replace(/[$,]/g, "");
}

interface ValidationData {
  paymentAmount: string;
  socialSecurity: string;
  medicare: string;
  taxWithholding: string;
}

async function isValid(
  page: puppeteer.Page,
  data: ValidationData
): Promise<boolean> {
  const rowsToValidateArg = [
    { label: "Tax Form", value: "941 Employers Federal Tax" },
    { label: "Tax Type", value: "Federal Tax Deposit" },
    { label: "Payment Amount", value: data.paymentAmount },
    { label: "Settlement Date", value: "%before-the-16th%" },
    { label: "Social Security", value: data.socialSecurity },
    { label: "Medicare", value: data.medicare },
    { label: "Tax Withholding", value: data.taxWithholding },
  ];

  return page.$$eval(
    ".formContainer tr",
    (tableRows, rowsToValidate) => {
      for (const { label, value } of rowsToValidate) {
        const { textContent = null } =
          tableRows.find((row) => {
            return row.textContent?.includes(label);
          }) ?? {};

        if (!textContent) {
          return false;
        }

        if (value === "%before-the-16th%") {
          const paymentDate = textContent.replace(label, "").trim();
          const [_month, date] = paymentDate.split("/");
          if (Number(date) > 15) {
            return false;
          }
        } else if (!textContent.includes(value)) {
          return false;
        }
      }

      return true;
    },
    rowsToValidateArg
  );
}
