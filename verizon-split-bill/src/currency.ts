import currencyJs from "currency.js";

export default function currency(amount: currencyJs.Any) {
  return currencyJs(amount);
}
