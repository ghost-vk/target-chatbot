class UserDto {
  id
  username
  firstName
  lastName
  lastIncome
  lastEcho
  ban

  constructor(model) {
    this.id = model.id
    this.username = model.username
    this.firstName = model.first_name
    this.lastName = model.last_name
    this.lastIncome = model.last_income_id
    this.lastEcho = model.last_echo_id
    this.ban = model.ban
  }
}

module.exports = UserDto