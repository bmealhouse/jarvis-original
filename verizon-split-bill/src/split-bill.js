import currency from './currency'

export default bill => {
  const breakdownPerLine = calculateBreakdownPerLine(bill)
  return {
    balanceText: bill.balanceText,
    breakdownPerLine,
    breakdownPerFamily: calculateBreakdownPerFamily(breakdownPerLine),
    totalAmount: bill.totalAmount,
  }
}

const calculateTotal = lines => {
  return lines
    .map(line => line.amount)
    .reduce((total, value) => total.add(value), currency(0))
}

function calculateBreakdownPerLine(bill) {
  const numberOfLines = bill.lineLevelDetails.length
  const planAmountPerLine = currency(bill.planAmount).divide(numberOfLines)
  const breakdownPerLine = bill.lineLevelDetails.map(line => ({
    firstName: line.header.split(' ')[0],
    phoneNumber: line.mtn.replace(/\./g, '-'),
    amount: currency(line.value).add(planAmountPerLine),
  }))

  const total = calculateTotal(breakdownPerLine)
  const leftOverPennies = total.subtract(bill.totalAmount)

  return breakdownPerLine.map(line => {
    if (line.phoneNumber !== process.env.VZW_DISCOUNTED_LINE) return line
    return {...line, amount: line.amount.subtract(leftOverPennies)}
  })
}

function calculateBreakdownPerFamily(breakdownPerLine) {
  const combine = phoneNumbers => {
    return calculateTotal(
      breakdownPerLine.filter(line => phoneNumbers.includes(line.phoneNumber)),
    )
  }

  return JSON.parse(process.env.VZW_FAMILY_CONFIG).map(familyConfig => ({
    ...familyConfig,
    amount: combine(familyConfig.phoneNumbers),
  }))
}
