import { JsonRpcProvider } from "ethers"

export const retryWrapper = async <T>(asyncFunc: () => Promise<T>, times = 30) => {
  let i = 0
  let lastError = null
  while (i < times) {
    i++
    try {
      const res = await asyncFunc()
      return res
    } catch (error) {
      lastError = error
    }
    await new Promise((r) => setTimeout(() => r(true), 5_000))
  }
  throw lastError
}

export const createProvider = (url: string) =>
  new JsonRpcProvider(url, undefined, { batchMaxCount: 1 })

export const sleep = async (ms: number) => await new Promise((r) => setTimeout(r, ms))
