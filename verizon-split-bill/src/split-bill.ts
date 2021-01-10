import currencyJs from "currency.js";
import { LineInfo, FamilyInfo, SplitBill, Verizon } from "../types";
import currency from "./currency";

export interface Bill {
  balanceText: string;
  totalAmount: currencyJs;
  planAmount: currencyJs;
  lineLevelDetails: Verizon.LineLevelDetails[];
}

export default function splitBill(bill: Bill): SplitBill {
  const breakdownPerLine = calculateBreakdownPerLine(bill);
  return {
    balanceText: bill.balanceText,
    breakdownPerLine,
    breakdownPerFamily: calculateBreakdownPerFamily(breakdownPerLine),
    totalAmount: bill.totalAmount,
  };
}

function calculateTotal(lines: LineInfo[]): currencyJs {
  const total = currency(0);

  for (const line of lines) {
    total.add(line.amount);
  }

  return total;
}

function calculateBreakdownPerLine(bill: Bill): LineInfo[] {
  const numberOfLines = bill.lineLevelDetails.length;
  const planAmountPerLine = currency(bill.planAmount).divide(numberOfLines);
  const breakdownPerLine = bill.lineLevelDetails.map<LineInfo>((line) => ({
    firstName: line.header.split(" ")[0],
    phoneNumber: line.mtn.replace(/\./g, "-"),
    amount: currency(line.value).add(planAmountPerLine),
  }));

  const total = calculateTotal(breakdownPerLine);
  const leftOverPennies = total.subtract(bill.totalAmount);

  return breakdownPerLine.map((line) => {
    if (line.phoneNumber !== process.env.VZW_DISCOUNTED_LINE) return line;
    return { ...line, amount: line.amount.subtract(leftOverPennies) };
  });
}

function calculateBreakdownPerFamily(
  breakdownPerLine: LineInfo[]
): FamilyInfo[] {
  const combine = (phoneNumbers: string[]) => {
    return calculateTotal(
      breakdownPerLine.filter((line) => phoneNumbers.includes(line.phoneNumber))
    );
  };

  interface FamilyConfig {
    names: string;
    phoneNumbers: string[];
  }

  return JSON.parse(process.env.VZW_FAMILY_CONFIG!).map(
    (familyConfig: FamilyConfig) => ({
      ...familyConfig,
      amount: combine(familyConfig.phoneNumbers),
    })
  );
}
