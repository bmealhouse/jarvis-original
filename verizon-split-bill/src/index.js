/** @typedef { import("../types/module").EmailTopSection } EmailTopSection */
/** @typedef { import("../types/module").ChargesByMtn } ChargesByMtn */
/** @typedef { import("../types/module").ChargesByFamily } ChargesByFamily */
/** @typedef { import("../types/module").QuoteOfTheDay } QuoteOfTheDay */
/** @typedef { import("../types/verizon").Verizon.Response } VerizonResponse */

import axios from "axios";
import currency from "currency.js";
import puppeteer from "puppeteer";

import { sendEmail } from "./send-email.js";

const VZW_VIEWPAYBILL_URL = "https://login.verizonwireless.com/vzauth/UI/Login";
const VZW_USERNAME = /** @type {string} */ (process.env.VZW_USERNAME);
const VZW_PASSWORD = /** @type {string} */ (process.env.VZW_PASSWORD);
const VZW_SECRET_ANSWER = /** @type {string} */ (process.env.VZW_SECRET_ANSWER);
const VZW_FAMILY_CONFIG = /** @type {string} */ (process.env.VZW_FAMILY_CONFIG);
const VZW_DISCOUNTED_MTN = /** @type {string} */ (
  process.env.VZW_DISCOUNTED_MTN
);

main();
async function main() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      devtools: true,
    });

    const page = await browser.newPage();
    await page.goto(VZW_VIEWPAYBILL_URL, {
      waitUntil: "networkidle0",
    });

    await page.waitForSelector("#login-form");

    /** @type {?VerizonResponse} */
    let billLandingData = null;

    /** @type {?VerizonResponse} */
    let billLandingMiddleSectionData = null;

    page.on("requestfinished", async (request) => {
      const url = request.url();
      if (url.includes("/bill_landing")) {
        const response = request.response();
        if (response?.ok()) {
          const json = await response.json();
          if (url.includes("/bill_landing_middlesection")) {
            billLandingMiddleSectionData = json;
          } else if (url.includes("/bill_landing")) {
            billLandingData = json;
          }
        }
      }
    });

    console.log("Logging in to verizonwireless.com…");
    await page.type("#IDToken1", VZW_USERNAME);
    await page.type("#IDToken2", VZW_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click("#login-submit"),
    ]);

    try {
      await page.waitForSelector("#challengequestion");

      console.log("Answering security question…");
      await page.type("#IDToken1", VZW_SECRET_ANSWER);
      await page.click("#rememberComputer"); // uncheck rememeber me checkbox
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.click("#otherButton"),
      ]);
    } catch {}

    console.log("Waiting for successful login…");
    await page.waitForSelector('[analyticstrack="View bill"]');

    console.log("Viewing bill…");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('[analyticstrack="View bill"]'),
    ]);

    const WAIT_DURATION = 100;
    const MAX_DURATION = 5000;

    let totalDuration = 0;
    while (
      totalDuration <= MAX_DURATION &&
      // eslint-disable-next-line no-unmodified-loop-condition
      (billLandingData === null || billLandingMiddleSectionData === null)
    ) {
      totalDuration += WAIT_DURATION;
      await page.waitForTimeout(WAIT_DURATION); // eslint-disable-line no-await-in-loop
    }

    if (billLandingData === null || billLandingMiddleSectionData === null) {
      throw new Error("Did not receive bill landing data");
    }

    const topSection = buildTopSection(billLandingData);
    const chargesByMtn = buildChargesByMtn(
      topSection.billAmount,
      billLandingMiddleSectionData
    );
    const chargesByFamily = buildChargesByFamily(chargesByMtn);

    await browser.close();

    console.log("Fetching quote of the day…");
    const quoteOfTheDay = await fetchQuoteOfTheDay();

    await sendEmail({
      topSection,
      chargesByMtn,
      chargesByFamily,
      quoteOfTheDay,
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * @param {VerizonResponse} data
 * @returns {EmailTopSection}
 */
function buildTopSection(data) {
  console.log("Parsing bill landing data…");

  const {
    body: { sections },
  } = data;

  const viewBillMainSection = sections.find(
    (section) => section.sectionType === "viewBillMainSection"
  );

  const viewBillTopSection = viewBillMainSection?.sections.find(
    (section) => section.sectionType === "viewBillTopSection"
  );

  const viewBillTopSectionContent = viewBillTopSection?.contents.find(
    (content) => content.contentType === "viewBillTopSection"
  );

  const headerText = viewBillTopSectionContent?.items.find(
    (item) => item.itemKey === "headerText"
  );
  const billAmount = viewBillTopSectionContent?.items.find(
    (item) => item.itemKey === "billAmount"
  );
  const billMessage = viewBillTopSectionContent?.items.find(
    (item) => item.itemKey === "billMessage"
  );

  return {
    headerText: headerText?.itemValue.trim() ?? "",
    billAmount: currency(billAmount?.itemValue ?? 0),
    billMessage: billMessage?.itemValue.trim() ?? "",
  };
}

/**
 * @param {currency} billAmount
 * @param {VerizonResponse} data
 * @returns {ChargesByMtn}
 */
function buildChargesByMtn(billAmount, data) {
  console.log("Parsing bill landing middle section data…");

  const {
    body: { sections },
  } = data;

  const viewBillMiddleSection = sections.find(
    (section) => section.sectionType === "viewBillMiddleSection"
  );

  const viewBillChargesSections = viewBillMiddleSection?.sections.find(
    (section) => section.sectionType === "viewBillChargesSection"
  );

  /** @type {currency} */
  let planAmount = currency(0);

  /** @type {ChargesByMtn} */
  const chargesByMtn = {};

  for (const charge of viewBillChargesSections?.data.groupCharges ?? []) {
    for (const key of charge.dataKey) {
      const { isLineLevel = false, currentBillCost = "$0.00" } =
        viewBillChargesSections?.data[key] ?? {};

      if (!isLineLevel) {
        planAmount = currency(currentBillCost);
        continue;
      }

      if (!chargesByMtn[charge.mtn]) {
        chargesByMtn[charge.mtn] = {
          nickname: charge.mtnNickName,
          mtn: charge.mtn,
          formattedMtn: charge.subHeaderText.replace(/\./g, "-"),
          amount: currency(0),
        };
      }

      const currentMtn = chargesByMtn[charge.mtn];
      currentMtn.amount = currentMtn.amount.add(currentBillCost);
    }
  }

  const totalMtns = Object.keys(chargesByMtn).length;
  const amountPerMtn = planAmount.divide(totalMtns);

  let total = currency(0);
  for (const item of Object.values(chargesByMtn)) {
    item.amount = item.amount.add(amountPerMtn);
    total = total.add(item.amount);
  }

  const leftOverCents = total.subtract(billAmount);
  const discountedMtn = chargesByMtn[VZW_DISCOUNTED_MTN];
  discountedMtn.amount = discountedMtn.amount.subtract(leftOverCents);

  return chargesByMtn;
}

/**
 * @param {ChargesByMtn} chargesByMtn
 * @returns {ChargesByFamily}
 */
function buildChargesByFamily(chargesByMtn) {
  /** @type {ChargesByFamily} */
  const chargesByFamily = {};

  /** @type {Array<{ family: string, mtns: string[] }>} */
  const familyConfig = JSON.parse(VZW_FAMILY_CONFIG);

  for (const { family, mtns } of familyConfig) {
    let amount = currency(0);
    for (const item of Object.values(chargesByMtn)) {
      if (mtns.includes(item.mtn)) {
        amount = amount.add(item.amount);
      }
    }

    chargesByFamily[family] = {
      family,
      mtns,
      amount,
    };
  }

  return chargesByFamily;
}

/**
 * @returns {Promise<QuoteOfTheDay>}
 */
async function fetchQuoteOfTheDay() {
  const response = await axios.get(
    "http://quotes.rest/qod.json?category=inspire"
  );

  return response.data.contents.quotes[0];
}
