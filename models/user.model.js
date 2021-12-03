const db = require('./../db')

class UserModel {
  id
  username
  firstName
  lastName
  lastIncome // last message sent from bot
  lastEcho
  userStatus

  constructor(
    id,
    username = null,
    firstName = null,
    lastName = null,
    lastIncome = null,
    currentProductId = null,
    status = null,
    ban = false,
    lastEcho = null,
  ) {
    this.id = Number(id)
    this.username = username ? username : '---'
    this.firstName = firstName
    this.lastName = lastName
    this.lastIncome = lastIncome ? Number(lastIncome) : null
    this.currentProductId = currentProductId ? Number(currentProductId) : null
    this.status = status
    this.ban = ban
    this.lastEcho = lastEcho
  }

  async add() {
    try {
      if (!this.id) {
        return false
      }
      const result = await db.query(
        `INSERT INTO users (id, username, first_name, last_name, last_income_id, ban, last_echo_id)
          VALUES ($1, $2, $3, $4, DEFAULT, DEFAULT, DEFAULT) RETURNING *`,
        [this.id, this.username, this.firstName, this.lastName]
      )
      return result.rows[0]
    } catch (e) {
      throw new Error(e)
    }
  }

  field(field = 'id') {
    if (
      ![
        'id',
        'username',
        'firstName',
        'lastName',
        'lastIncome',
        'currentProductId',
        'userStatus',
        'ban',
        'lastEcho'
      ].includes(field)
    ) {
      throw new Error('Not available field to get from UserModel')
    }
    return this[field]
  }

  async setLastIncomeMessageId(messageId) {
    try {
      const result = await db.query(
        `UPDATE users
        SET last_income_id = $1
        WHERE id = $2 RETURNING last_income_id`,
        [messageId, this.id]
      )
      this.lastIncome = result.rows[0].last_income_id
      return this.lastIncome
    } catch (e) {
      throw new Error(e)
    }
  }

  async setLastEchoMessageId(messageId) {
    try {
      const result = await db.query(
        `UPDATE users
        SET last_echo_id = $1
        WHERE id = $2 RETURNING last_echo_id`,
        [messageId, this.id]
      )
      this.lastEcho = result.rows[0].last_echo_id
      return this.lastEcho
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getUser(key, field = 'id') {
    try {
      if (!['id', 'username'].includes(field)) {
        throw new Error('Not acceptable field to get user from database.')
      }
      const result = await db.query(`SELECT * FROM users WHERE ${field} = $1`, [
        key,
      ])
      if (result.rows.length === 0) {
        return {}
      }
      const fields = result.rows[0]
      const user = new UserModel(
        fields.id,
        fields.username,
        fields.first_name,
        fields.last_name,
        fields.last_income_id,
        fields.current_product_id,
        fields.status,
        fields.ban,
        fields.last_echo_id
      )
      return user
    } catch (e) {
      throw new Error('Error when try to get user from database')
    }
  }

  async handleBanUser(flag = true) {
    try {
      const result = await db.query(
        `UPDATE users SET ban = $1 WHERE id = $2 RETURNING *`,
        [flag, this.id]
      )
      if (result.rows.length === 0) {
        throw new Error("Can't update `ban` to user " + this.id)
      }
      return true
    } catch (e) {
      throw new Error('Error when ban user')
    }
  }
}

module.exports = UserModel
