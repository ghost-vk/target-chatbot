const { getCurrency } = require('./../config')

module.exports = function currencyFilter(amount, currency = 'USD') {
  const amountNum = Number(amount)
  if (!Number(amountNum)) {
    return false
  }
  switch (currency) {
    case 'USD' : {
      return `$${amountNum} 🇺🇸`
    }
    case 'RUB' : {
      return `${Math.round(amountNum * getCurrency())} ₽ 🇷🇺`
    }
  }
  return false
}