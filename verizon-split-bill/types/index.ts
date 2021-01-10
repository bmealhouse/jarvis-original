import currencyJs from "currency.js";

export interface LineInfo {
  firstName: string;
  phoneNumber: string;
  amount: currencyJs;
}

export interface FamilyInfo {
  names: string;
  phoneNumbers: string[];
  amount: currencyJs;
}

export interface SplitBill {
  balanceText: string;
  breakdownPerLine: LineInfo[];
  breakdownPerFamily: FamilyInfo[];
  totalAmount: currencyJs;
}

export interface QuoteOfTheDay {
  quote: string;
  author: string;
}

export { Verizon } from "./verizon";
