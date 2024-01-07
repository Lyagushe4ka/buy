import {
  Contract,
  ContractTransactionResponse,
  JsonRpcProvider,
  Overrides,
  TransactionReceipt,
  TransactionResponse,
  Wallet,
  parseEther,
  parseUnits,
} from "ethers"
import abi from "./abi.json"
import { createProvider, retryWrapper, sleep } from "./utils"

const key = "" // private key
const ethValue = "" // eth value to send, e.g. 0.1 or 1
const CONTRACT_ADDRESS = "0xB6e19aABF457740e0077eb112805B3abab04A9f9"
const TIMESTAMP = 1704546000000

const providers = [
  "https://arbitrum.llamarpc.com",
  "https://arb-pokt.nodies.app",
  "https://rpc.ankr.com/arbitrum",
  "https://rpc.arb1.arbitrum.gateway.fm",
  "https://arbitrum.drpc.org",
]

// когда снайпим очень важно понимать что ethers под собой при не указанных значениях цены газа,
// газ лимита и нонса их получает, и если есть возможность то их надо хардкодить заранее
// ведь при отправке транзы сначала эти три запроса проходят что занимает время

const maxFeePerGasInGwei = "5"
const maxPriorityFeePerGasInGwei = "5"
const gasLimit = 600_000

const timeTrigger = async (timeTrigger: number) => {
  const timeTriggerJustBefore = timeTrigger - 1_000
  let ready = false
  while (!ready) {
    if (Date.now() >= timeTriggerJustBefore) {
      return
    }
    await sleep(100)
  }
}

const singleRpcSpammer = async (provider: JsonRpcProvider, signedTx: string) => {
  let receipt: TransactionReceipt | null = null

  const waiter = async (txResp: TransactionResponse) => {
    while (true) {
      try {
        const receiptLocal = await txResp.wait()

        receipt = receiptLocal as TransactionReceipt
        return
      } catch (error) {
        //
      }
    }
  }

  while (!receipt) {
    try {
      const tx = await provider.broadcastTransaction(signedTx)
      waiter(tx)
    } catch {
      await sleep(300)
    }
  }

  return receipt as TransactionReceipt
}

async function main() {
  if (!ethValue || !key) {
    throw new Error("No value or key provided")
  }

  const provider = createProvider(providers[0])
  const wallet = new Wallet(key, provider)
  const contract = new Contract(CONTRACT_ADDRESS, abi, wallet)

  const value = parseEther(ethValue)
  const maxFeePerGas = parseUnits(maxFeePerGasInGwei, "gwei")
  const maxPriorityFeePerGas = parseUnits(maxPriorityFeePerGasInGwei, "gwei")

  const nonce = await retryWrapper(() => wallet.getNonce())

  const overrides: Overrides = {
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasLimit,
    nonce,
  }

  const preparedTx = await retryWrapper(() =>
    contract.contribute.populateTransaction(overrides)
  )
  const signedTransaction = await retryWrapper(() => wallet.signTransaction(preparedTx))

  const createdProviders = providers.map((p) => createProvider(p))

  await timeTrigger(TIMESTAMP)

  const result = await Promise.race(
    createdProviders.map((prov) => singleRpcSpammer(prov, signedTransaction))
  )

  console.log(`TX: ${result.hash} | ${result.status === 0 ? "FAILED" : "SUCCESS"}`)
}

main()
