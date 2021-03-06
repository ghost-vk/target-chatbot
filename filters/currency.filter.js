const { getCurrency } = require('./../config')

module.exports = function currencyFilter(amount, currency = 'USD') {
  const amountNum = Number(amount)
  if (!Number(amountNum)) {
    return false
  }
  switch (currency) {
    case 'USD' : {
      return `$${amountNum} πΊπΈ`
    }
    case 'RUB' : {
      return `${Math.round(amountNum * getCurrency())} β½ π·πΊ`
    }
  }
  return false
}