module.exports = function sleep(ms = 100) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), ms)
  })
}