const db = require('./../db')
const UserModel = require('./../models/user.model')

class UserService {
  /**
   * Fetch users without channels from database
   * @returns {Promise<Array>}
   */
  async getUsers() {
    try {
      const result = await db.query('SELECT * FROM users')
      let users = []
      result.rows.forEach((r) => {
        users.push(
          new UserModel(
            r.id,
            r.username,
            r.first_name,
            r.last_name,
            r.last_income_id,
            r.current_product_id,
            r.status,
            r.ban,
            r.last_echo_id
          )
        )
      })
      return users
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = new UserService()
