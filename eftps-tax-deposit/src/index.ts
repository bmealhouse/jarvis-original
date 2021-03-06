import { config } from "dotenv";
import * as puppeteer from "puppeteer";
import * as inquirer from "inquirer";
import * as clipboardy from "clipboardy";

config();
void main();

const [_node, _script, arg] = process.argv;
const taxForm = arg === "--form-940" ? "940" : "941";

async function main() {
  try {
    const browser = await puppeteer.launch({
      devtools: false,
      headless: false,
      slowMo: 25,
      defaultViewport: {
        width: 1024,
        height: 768,
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

    console.log(`Entering form ${taxForm}…`);
    await page.type("#TaxForm_EditField", taxForm);
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
      taxPeriod?: "Q1" | "Q2" | "Q3" | "Q4";
      year: string;
    };

    const questions: inquirer.QuestionCollection[] = [
      { name: "paymentAmount", message: "Payment amount (EFTPS):" },
    ];

    if (taxForm === "941") {
      questions.push({
        type: "list",
        name: "taxPeriod",
        message: "Tax period:",
        choices: ["Q1", "Q2", "Q3", "Q4"],
      });
    }

    questions.push({ name: "year", message: "Year:" });

    const {
      paymentAmount,
      taxPeriod,
      year,
    } = await inquirer.prompt<PaymentAnswers>(questions);

    await page.waitForSelector('[name="singlePayment.amount.value"]');

    console.log("Entering business tax payment info…");
    await page.type(
      '[name="singlePayment.amount.value"]',
      formatCurrency(paymentAmount)
    );

    if (taxForm === "941" && taxPeriod) {
      await page.select(
        '[name="singlePayment.taxPeriodMonth"]',
        { Q1: "3", Q2: "6", Q3: "9", Q4: "12" }[taxPeriod]
      );
    }

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

    let subCategoryAmountAnswers: SubCategoryAmountAnswers | undefined;

    if (taxForm === "941") {
      const answers = await inquirer.prompt<SubCategoryAmountAnswers>([
        { name: "socialSecurity", message: "Social security:" },
        { name: "medicare", message: "Medicare:" },
        { name: "taxWithholding", message: "Tax withholding:" },
      ]);

      subCategoryAmountAnswers = {
        socialSecurity: answers.socialSecurity,
        medicare: answers.medicare,
        taxWithholding: answers.taxWithholding,
      };

      await page.waitForSelector(
        '[name="singlePayment.subCategories[0].amount.value"]'
      );

      console.log("Entering sub category amounts…");
      await page.type(
        '[name="singlePayment.subCategories[0].amount.value"]',
        formatCurrency(subCategoryAmountAnswers.socialSecurity)
      );
      await page.type(
        '[name="singlePayment.subCategories[1].amount.value"]',
        formatCurrency(subCategoryAmountAnswers.medicare)
      );
      await page.type(
        '[name="singlePayment.subCategories[2].amount.value"]',
        formatCurrency(subCategoryAmountAnswers.taxWithholding)
      );
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.click('[value="next"]'),
      ]);
    }

    await page.waitForSelector('[value="makePayment"]');

    console.log("Validating payment information…");
    if (
      await isValid(page, {
        paymentAmount,
        subCategoryAmountAnswers,
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
    const filename =
      taxForm === "941"
        ? `${year}-${month} EFTPS Deposit`
        : `${year}-EOY QUBED, INC Form 940 Deposit`;

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

type SubCategoryAmountAnswers = {
  socialSecurity: string;
  medicare: string;
  taxWithholding: string;
};

interface ValidationData {
  paymentAmount: string;
  subCategoryAmountAnswers?: SubCategoryAmountAnswers;
}

async function isValid(
  page: puppeteer.Page,
  data: ValidationData
): Promise<boolean> {
  const rowsToValidateArg = [
    {
      label: "Tax Form",
      value:
        taxForm === "941"
          ? "941 Employers Federal Tax"
          : "940 Employers Annual Unemployment Tax",
    },
    {
      label: "Tax Type",
      value: "Federal Tax Deposit",
    },
    {
      label: "Payment Amount",
      value: data.paymentAmount,
    },
  ];

  if (taxForm === "941" && data.subCategoryAmountAnswers) {
    rowsToValidateArg.push(
      {
        label: "Settlement Date",
        value: "%before-the-16th%",
      },
      {
        label: "Social Security",
        value: data.subCategoryAmountAnswers.socialSecurity,
      },
      {
        label: "Medicare",
        value: data.subCategoryAmountAnswers.medicare,
      },
      {
        label: "Tax Withholding",
        value: data.subCategoryAmountAnswers.taxWithholding,
      }
    );
  }

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
