const to = require('await-to-js').default
const db = require('./../db')

/**
 * @typedef {object} ProductFields
 * @property {string|number} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} duration
 * @property {string|number} price_usd
 * @property {string|number} price_rub
 * @property {string} message_code
 * @property {string|number} channel_id
 * @property {string} secret_link
 * @property {string} type
 * @property {string|number} course_id
 */

class ProductModel {
  /**
   * @param {ProductFields} data
   */
  constructor(data) {
    /**
     * @public
     * @type {string|number}
     */
    this.id = data.id

    /**
     * @public
     * @type {string}
     */
    this.title = data.title

    /**
     * @public
     * @type {string}
     */
    this.subtitle = data.subtitle

    /**
     * @public
     * @type {string}
     */
    this.duration = data.duration

    /**
     * @public
     * @type {string|number}
     */
    this.priceUsd = data.price_usd

    /**
     * @public
     * @type {string|number}
     */
    this.priceRub = data.price_rub

    /**
     * @public
     * @type {string}
     */
    this.messageCode = data.message_code

    /**
     * @public
     * @type {string|number}
     */
    this.channelId = data.channel_id

    /**
     * @public
     * @type {string}
     */
    this.secretLink = data.secret_link

    /**
     * @public
     * @type {string}
     */
    this.type = data.type

    /**
     * @public
     * @type {string|number}
     */
    this.courseId = data.course_id
  }

  /**
   * Returns product model from database
   * @param key
   * @param field
   * @return {Promise<ProductModel|boolean|{error: string|Error}>}
   */
  static async getProductFromDatabase(key, field = 'id') {
    try {
      if (!['id', 'message_code'].includes(field)) {
        return { error: 'Not available field' }
      }

      const [err, result] = await to(db.query(`SELECT * FROM products WHERE ${field} = $1`, [key]))

      if (err) return { error: err }

      if (result.rows.length === 0) return false

      return new ProductModel(result.rows[0])
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = ProductModel
