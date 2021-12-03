const addZero = (num) => {
  return num < 10 ? '0' + num : num
}

module.exports = {
  dateToYmd: (date) => {
    let toFormat = date
    if (typeof toFormat.getMonth !== 'function') {
      toFormat = new Date(date)
      if (typeof toFormat.getMonth !== 'function') {
        return false
      }
    }

    const y = toFormat.getFullYear()
    const m = addZero(toFormat.getMonth() + 1)
    const d = addZero(toFormat.getDate())

    return `${d}.${m}.${y}`
  }
}