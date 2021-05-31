import currency from "currency.js";

export interface EmailRequest {
  topSection: EmailTopSection;
  chargesByMtn: ChargesByMtn;
  chargesByFamily: ChargesByFamily;
  quoteOfTheDay: QuoteOfTheDay;
}

export interface EmailTopSection {
  headerText: string;
  billAmount: currency;
  billMessage: string;
}

export type ChargesByMtn = Record<
  string,
  {
    nickname: string;
    mtn: string;
    formattedMtn: string;
    amount: currency;
  }
>;

export type ChargesByFamily = Record<
  string,
  {
    family: string;
    mtns: string[];
    amount: currency;
  }
>;

export interface QuoteOfTheDay {
  quote: string;
  author: string;
}
