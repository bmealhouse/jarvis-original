import sendgrid from "@sendgrid/mail";
import mjml2html from "mjml";
import { SplitBill, QuoteOfTheDay } from "../types";

interface EmailInput {
  bill: SplitBill;
  quoteOfTheDay: QuoteOfTheDay;
}

export default async function sendEmail(emailInput: EmailInput) {
  console.log("Sending email…");

  const emailMessage: sendgrid.MailDataRequired = {
    to: process.env.SENDGRID_TO!.split(","),
    from: process.env.SENDGRID_FROM!,
    subject: "Verizon Bill",
    html: generateHtml(emailInput),
  };

  try {
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);
    await sendgrid.send(emailMessage);
  } catch (error: unknown) {
    console.error(error);
  }
}

function generateHtml({ bill, quoteOfTheDay }: EmailInput): string {
  const breakdownPerLine = bill.breakdownPerLine.map(
    (line, index) => `<tr${
      index < bill.breakdownPerLine.length - 1
        ? ' style="border-bottom:1px solid #ecedee;text-align:left;padding:15px 0;"'
        : ""
    }>
  <td style="padding: 0 15px 0 0;font-weight:bold;">${line.firstName}</td>
  <td style="padding: 0 15px;">${line.phoneNumber}</td>
  <td style="padding: 0 0 0 15px;">${line.amount.format()}</td>
</tr>`
  );

  const breakdownPerFamily = bill.breakdownPerFamily.map(
    (family, index) => `<tr ${
      index < bill.breakdownPerFamily.length - 1
        ? ' style="border-bottom:1px solid #ecedee;text-align:left;padding:15px 0;"'
        : ""
    }>
  <td style="padding: 0 15px 0 0;font-weight:bold;">${family.names}</td>
  <td style="padding: 0 0 0 15px;">${family.amount.format()}</td>
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
          bill.balanceText
        }</mj-text>
        <mj-button font-family="Helvetica, Arial" background-color="#d52b1e" color="#fff" align="left" href="https://m.vzw.com/m/hhr7?EMHID=47160068f6075255caa8edd8624a76c9&cmp=EMC-OMT-BILLREADY&vt=BR-CTA-ViewPayBill">View and pay your bill</mj-button>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="18px" font-weight="bold">Price per line.</mj-text>
        <mj-table font-family="Helvetica, Arial">
          ${breakdownPerLine.join("")}
        </mj-table>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="18px" font-weight="bold">Price per family.</mj-text>
        <mj-table font-family="Helvetica, Arial">
          ${breakdownPerFamily.join("")}
        </mj-table>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-divider border-color="#d52b1e"></mj-divider>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-family="Helvetica, Arial" font-size="28px" font-weight="bold" align="right">TOTAL: ${bill.totalAmount.format()}</mj-text>
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
