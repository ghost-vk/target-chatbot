const debug = require('debug')('boot:axios')
const axios = require('axios')
const config = require('./../config')

const api = axios.create({
  withCredentials: true,
  baseURL: config.API_URL,
})

const login = async () => {
  try {
    const response = await axios.post(config.API_URL + '/auth/login', {
      login: config.API_LOGIN,
      password: config.API_PASSWORD
    })

    config.setApiToken(response.data.accessToken)

    return response.data
  } catch (e) {
    throw e
  }
}

api.interceptors.request.use(
  async (axiosConfig) => {
    if (!config.getApiToken()) await login()

    axiosConfig.headers.Authorization = `Bearer ${config.getApiToken()}`

    debug('Do request with Authorization Header. URL: %O', axiosConfig.url)

    return axiosConfig
  },
  (e) => {
    return Promise.reject(e)
  }
)

api.interceptors.response.use(
  (config) => config,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response.status === 401 &&
      error.config &&
      !error.config._isRetry
    ) {
      originalRequest._isRetry = true
      try {
        await login()

        return api.request(originalRequest)
      } catch (e) {
        console.log(e)
      }
    }
    throw error
  }
)

module.exports = api
