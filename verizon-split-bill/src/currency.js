import currencyJs from 'currency.js'

const options = {formatWithSymbol: true}
export default amount => currencyJs(amount, options)
