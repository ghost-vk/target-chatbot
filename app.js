const config = require('./config')
const express = require('express')
const app = express()
const errorMiddleware = require('./middleware/error.middleware')
const { bot } = require('./services/bot.service')
const { listenTg } = require('./services/tg-listener.service')
const scheduleWork = require('./services/shedule.service')
const debug = require('debug')('http')
const CurrencyService = require('./services/currency.service')
const fs = require('fs')
const https = require('https')

// Routes
const botRoute = require('./routes/bot.route')

app.use(express.json())

app.use('/', botRoute)

app.all('*', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use(errorMiddleware)

if (config.IS_DEV) {
  config.setUrl('https://7de8-91-215-89-189.ngrok.io')
}

scheduleWork()

const start = async () => {
  try {
    debug('Set Telegram webhook')
    await bot.setWebHook(`${config.URL}/bot${config.BOT_TOKEN}`)
    await listenTg()

    if (config.IS_PRODUCTION) {
      const httpsServer = https.createServer(
        {
          key: fs.readFileSync('/etc/letsencrypt/live/anastasi-target.ru/privkey.pem'),
          cert: fs.readFileSync('/etc/letsencrypt/live/anastasi-target.ru/cert.pem'),
          ca: fs.readFileSync('/etc/letsencrypt/live/anastasi-target.ru/chain.pem'),
        },
        app
      )
      httpsServer.listen(config.PORT, () => {
        debug(`Production https server is listening on port %d ...`, config.PORT)
      })
      await CurrencyService.updateCurrency()
    } else {
      app.listen(config.PORT, () => {
        debug(`Development http server is listening on port %d ...`, config.PORT)
      })
    }
  } catch (e) {
    debug('Error occurs when start app: %O', e)
    throw new Error(e)
  }
}
start()
