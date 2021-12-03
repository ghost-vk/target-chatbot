const config = require('./../config')
const axios = require('axios')

class CurrencyService {
  static async updateCurrency() {
    try {
      const response = await axios.get(`http://api.currencylayer.com/live`, {
        params: {
          access_key: config.CURRENCY_LAYER_KEY,
          source: 'USD',
          currencies: 'RUB',
          format: 1,
        },
      })
      if (response?.data?.quotes?.USDRUB) {
        config.setCurrency(response.data.quotes.USDRUB)
      }
      return true
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = CurrencyService