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
      slowMo: 50,
      defaultViewport: {
        width: 1024,
        height: 768,
      },
    });

    const page = await browser.newPage();
    await page.goto("https://www.mndor.state.mn.us/tp/eservices/_/", {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector("#Dd-4");

    console.log("Logging in to mndor.state.mn.us…");
    await page.type("#Dd-4", process.env.MNDOR_USERNAME!);
    await page.type("#Dd-5", process.env.MNDOR_PASSWORD!);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click("#Dd-6"),
    ]);

    // prompt for security code
    type SecurityCodeAnswer = { securityCode: string };
    const { securityCode } = await inquirer.prompt<SecurityCodeAnswer>([
      { name: "securityCode", message: "Security code:" },
    ]);

    await page.waitForSelector("#Dc-a");

    console.log("Entering verification code…");
    await page.type("#Dc-a", securityCode);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click("#action_2"),
    ]);

    await page.waitForSelector("#cl_Dl-j1-3");

    console.log("Navigating to make a payment…");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click("#cl_Dl-j1-3"),
    ]);

    await page.waitForSelector("#Dc-f1");

    console.log("Selecting payment type…");
    await page.select("#Dc-f1", "DEPPYM");

    const periodOptions = await page.$eval("#Dc-h1", (element) => {
      const selectMenu = element as HTMLSelectElement;
      return [...selectMenu.options]
        .map((option) => ({
          index: option.index,
          value: option.value,
          text: option.textContent?.trim() ?? "",
        }))
        .filter((option) => option.text !== "");
    });

    type PeriodAnswer = { period: string };
    const { period } = await inquirer.prompt<PeriodAnswer>([
      {
        type: "list",
        name: "period",
        message: "Period:",
        choices: periodOptions.map((option) => option.text),
      },
    ]);

    const selectedPeriod = periodOptions.find(
      (option) => option.text === period
    )!;

    type PaymentAmountAnswer = { paymentAmount: string };
    const { paymentAmount } = await inquirer.prompt<PaymentAmountAnswer>([
      { name: "paymentAmount", message: "Payment amount:" },
    ]);

    console.log(`Entering payment amount…`);
    await page.type("#Dc-l1", paymentAmount);

    // trigger form validation
    await page.click("#action_1");

    console.log(`Selecting ${selectedPeriod.text}…`);
    await page.select("#Dc-h1", selectedPeriod.value);

    console.log(`Entering confirm payment amount…`);
    await page.type("#Dc-m1", paymentAmount);

    await Promise.all([
      page.click("#action_1"),
      page.waitForSelector("#STANDARD_DIALOG_Confirmation"),
      page.waitForSelector(".ActionButtonOK"),
    ]);

    console.log("Validating confirmation…");
    if (await isValid(page, { paymentAmount })) {
      console.log("Confirming summary of payment…");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.click(".ActionButtonOK"),
      ]);

      await page.waitForSelector("#Dd-4");

      console.log("Navigating to printer friendly version…");
      await page.click("#Dd-4");
    } else {
      console.log("  something’s not quite right…\n");
    }

    const month = String(new Date().getMonth() || 12).padStart(2, "0");
    const [_date, _month, year] = selectedPeriod.text.split("-");
    const filename = `${year}-${month} MN Tax Deposit`;

    console.log("Copying filename to clipboard…");
    console.log(` > ${filename}`);
    await clipboardy.write(filename);
  } catch (error: unknown) {
    console.error(error);
  }
}

interface ValidationData {
  paymentAmount: string;
}

async function isValid(
  page: puppeteer.Page,
  data: ValidationData
): Promise<boolean> {
  const rowsToValidateArg = [
    { label: "Account Type:", value: "Withholding Tax" },
    { label: "Payment Type:", value: "Deposit Payment" },
    { label: "Payment Date:", value: "%before-the-16th%" },
    { label: "Payment Amount:", value: data.paymentAmount },
  ];

  return page.$$eval(
    ".ConfirmationForm tr",
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
          if (Number(paymentDate.slice(0, 2)) > 15) {
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
