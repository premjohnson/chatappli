const ACCESS_TOKEN_KEY = "accessToken"

let accessToken: string | null = null

export const setAccessToken = (token: string) => {
  accessToken = token
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export const getAccessToken = (): string | null => {

  if (!accessToken) {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  return accessToken
}

export const clearTokens = () => {
  accessToken = null
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}