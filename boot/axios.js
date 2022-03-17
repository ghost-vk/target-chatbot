const axios = require('axios')
const config = require('./../config')
const debug = require('debug')('boot:axios')

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
    debug('')
    throw e
  }
}

api.interceptors.request.use(
  async (axiosConfig) => {
    if (!config.getApiToken()) await login()

    axiosConfig.headers.Authorization = `Bearer ${config.getApiToken()}`

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
        const response = await axios.get(`${config.API_URL}/auth/refresh`, {
          withCredentials: true,
        })

        config.setApiToken(response.data.accessToken)

        return api.request(originalRequest)
      } catch (e) {
        console.log(e)
      }
    }
    throw error
  }
)

module.exports = api
