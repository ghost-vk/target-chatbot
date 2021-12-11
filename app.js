const config = require('./config')
const express = require('express')
const app = express()
const errorMiddleware = require('./middleware/error.middleware')
const { bot } = require('./services/bot.service')
const { listenTg } = require('./services/tg-listener.service')
const scheduleWork = require('./services/shedule.service')
const debug = require('debug')('http')
const CurrencyService = require('./services/currency.service')

// Routes
const botRoute = require('./routes/bot.route')

app.use(express.json())

app.use('/', botRoute)

app.all('*', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use(errorMiddleware)

if (config.IS_DEV) {
  config.setUrl('https://0e76-178-178-96-20.ngrok.io')
}

scheduleWork()

const start = async () => {
  try {
    debug('Set Telegram webhook')
    await bot.setWebHook(`${config.URL}/bot${config.BOT_TOKEN}`)
    await listenTg()

    if (config.IS_PRODUCTION) {
      await CurrencyService.updateCurrency()
    }
  } catch (e) {
    debug('Error occurs when start app: %O', e)
    throw new Error(e)
  }
}
start()
