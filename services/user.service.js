const db = require('./../db')
const UserModel = require('./../models/user.model')
const UserDto = require('./../dtos/user.dto')

class UserService {
  /**
   * Fetch users from database
   * @returns {Promise<Array>}
   */
  async getUsers() {
    try {
      const result = await db.query('SELECT * FROM users')
      let users = []
      result.rows.forEach((r) => {
        const userDto = new UserDto(r)
        users.push(new UserModel({ ...userDto }))
      })
      return users
    } catch (e) {
      throw new Error(e)
    }
  }

  async getSubscribers() {
    try {
      const result = await db.query('SELECT user_id FROM subscriptions WHERE is_expired = FALSE')
      const users = []
      if (result.rows.length === 0) {
        return users
      }
      for (const row of result.rows) {
        const user = await UserModel.getUser(row.user_id)
        users.push(user)
      }
      return users
    } catch (e) {
      throw new Error(e)
    }
  }

  async getAllWithoutSubscribersId() {
    try {
      const result = await db.query('SELECT id FROM users')
      const users = []
      if (result.rows.length === 0) {
        return users
      }
      const subscribers = await this.getSubscribers()
      const subscribersIds = subscribers.map((s) => s.id)
      for (const row of result.rows) {
        if (!subscribersIds.includes(Number(row.id))) {
          const user = await UserModel.getUser(row.id)
          users.push(user)
        }
      }
      return users
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = new UserService()
