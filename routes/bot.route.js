const Router = require('express').Router
const router = new Router()
const { BOT_TOKEN } = require('./../config')
const BotController = require('./../controllers/bot.controller')

router.post(`/bot${BOT_TOKEN}`, BotController.handle)

module.exports = router
