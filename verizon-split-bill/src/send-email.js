/** @typedef { import("../types/module").EmailRequest } EmailRequest */
/** @typedef { import("../types/module").QuoteOfTheDay } QuoteOfTheDay */

import sendgrid from "@sendgrid/mail";
import mjml2html from "mjml";

const SENDGRID_TO = /** @type {string} */ (process.env.SENDGRID_TO);
const SENDGRID_FROM = /** @type {string} */ (process.env.SENDGRID_FROM);
const SENDGRID_API_KEY = /** @type {string} */ (process.env.SENDGRID_API_KEY);

/**
 * @param {EmailRequest} request
 * @returns {Promise<void>}
 */
export async function sendEmail(request) {
  console.log("Sending email…");

  /** @type {sendgrid.MailDataRequired} */
  const emailMessage = {
    to: SENDGRID_TO.split(","),
    from: SENDGRID_FROM,
    subject: "Verizon Bill",
    html: generateHtml(request),
  };

  try {
    sendgrid.setApiKey(SENDGRID_API_KEY);
    await sendgrid.send(emailMessage);
  } catch (error) {
    console.error(error);
  }
}

/**
 * @param {EmailRequest} request
 * @returns {string}
 */
function generateHtml({
  topSection,
  chargesByMtn,
  chargesByFamily,
  quoteOfTheDay,
}) {
  const chargesByMtnRows = Object.values(chargesByMtn).map(
    (item, index) => `<tr${
      index < Object.values(chargesByMtn).length - 1
        ? ' style="border-bottom:1px solid #ecedee;text-align:left;padding:15px 0;"'
        : ""
    }>
  <td style="padding: 0 15px 0 0;font-weight:bold;">${
    item.nickname.split(" ")[0]
  }</td>
  <td style="padding: 0 15px;">${item.formattedMtn}</td>
  <td style="padding: 0 0 0 15px;">${item.amount.format()}</td>
</tr>`
  );

  const chargesByFamilyRows = Object.values(chargesByFamily).map(
    (item, index) => `<tr ${
      index < Object.values(chargesByFamily).length - 1
        ? ' style="border-bottom:1px solid #ecedee;text-align:left;padding:15px 0;"'
        : ""
    }>
  <td style="padding: 0 15px 0 0;font-weight:bold;">${item.family}</td>
  <td style="padding: 0 0 0 15px;">${item.amount.format()}</td>
</tr>`
  );

  const mjmlTemplate = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="36px" font-weight="bold">Verizon Bill</mj-text>
      </mj-column>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-style="italic" color="#666">&ldquo;${
          quoteOfTheDay.quote
        }&rdquo;</mj-text>
        <mj-text font-family="Helvetica, Arial" padding-top="0px">&mdash;${
          quoteOfTheDay.author
        }</mj-text>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-divider border-color="#d52b1e"></mj-divider>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="22px" font-weight="bold">${
          topSection.headerText
        } ${topSection.billAmount.format()}</mj-text>
        <mj-text font-family="Helvetica, Arial" padding-top="0px">${
          topSection.billMessage
        }</mj-text>
        <mj-button font-family="Helvetica, Arial" background-color="#d52b1e" color="#fff" align="left" href="https://m.vzw.com/m/hhr7?EMHID=47160068f6075255caa8edd8624a76c9&cmp=EMC-OMT-BILLREADY&vt=BR-CTA-ViewPayBill">View and pay your bill</mj-button>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="18px" font-weight="bold">Charges per line.</mj-text>
        <mj-table font-family="Helvetica, Arial">
          ${chargesByMtnRows.join("")}
        </mj-table>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="18px" font-weight="bold">Charges per family.</mj-text>
        <mj-table font-family="Helvetica, Arial">
          ${chargesByFamilyRows.join("")}
        </mj-table>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

  const { html } = mjml2html(mjmlTemplate, {
    minify: true,
    validationLevel: "strict",
  });

  return html;
}
