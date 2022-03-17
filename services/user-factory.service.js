const to = require('await-to-js').default
const generator = require('generate-password')
const UserModel = require('./../models/user.model')

class UserFactoryService {
  static async createLoginAndPassword(userId) {
    try {
      const [err, user] = await to(UserModel.getUser(userId))

      if (err) throw `User not exist. ${err.message}`

      const login = 't' + user.id
      const password = generator.generate({
        length: 12,
        numbers: true,
      })

      return {
        login,
        password,
      }
    } catch (e) {
      throw e.message
    }
  }

  /**
   * @param {ProductModel} product
   */
  static getCoursesRequestMarkup(product) {
    const duration = product.duration ? Number(product.duration) : 12

    const date = new Date()
    date.setMonth(date.getMonth() + duration)

    return {
      id: product.courseId,
      accessTo: date,
    }
  }
}

module.exports = UserFactoryService
