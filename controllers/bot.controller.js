const { bot } = require('./../services/bot.service')

class BotController {
  async handle(req, res, next) {
    try {
      bot.processUpdate(req.body)
      res.sendStatus(200)
    } catch (e) {
      next(e)
    }
  }
}

module.exports = new BotController()
