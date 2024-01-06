import { Contract, ContractTransactionResponse, JsonRpcProvider, Wallet, parseEther, parseUnits } from "ethers"
import abi from './abi.json'

const key = process.env.KEY;
const ethValue = process.env.VALUE;
const CONTRACT_ADDRESS = '0xB6e19aABF457740e0077eb112805B3abab04A9f9';
const TIMESTAMP = 1704546000000;

const providers = [
  'https://arbitrum.llamarpc.com',
  'https://arb-pokt.nodies.app',
  'https://rpc.ankr.com/arbitrum',
  'https://rpc.arb1.arbitrum.gateway.fm',
  'https://arbitrum.drpc.org',
]

async function main() {
  if (!ethValue || !key) {
    throw new Error("No value or key provided")
  }

  const value = parseEther(ethValue)

  while (true) {
    const url = providers[Math.floor(Math.random() * providers.length)]

    const currTime = Date.now()

    if (currTime < TIMESTAMP) {
      console.log(`Waiting until ${TIMESTAMP}`)
      await new Promise(r => setTimeout(r, 100))
      continue;
    }

    const PROVIDER = new JsonRpcProvider(url)

    const WALLET = new Wallet(key, PROVIDER)
    const CONTRACT = new Contract(CONTRACT_ADDRESS, abi, WALLET)

    try {

      const feeData = await PROVIDER.getFeeData()

      const { maxFeePerGas, maxPriorityFeePerGas } = feeData

      const finalMaxFee = maxFeePerGas ? maxFeePerGas * 2n : parseUnits('5', 'gwei')
      const finalMaxPriorityFee = maxPriorityFeePerGas ? maxPriorityFeePerGas * 2n : parseUnits('1', 'gwei')

      const tx: ContractTransactionResponse = await CONTRACT.contribute({ value, maxFeePerGas: finalMaxFee, maxPriorityFeePerGas: finalMaxPriorityFee })

      const receipt = await tx.wait()

      if (receipt && receipt.status === 1) {
        console.log(`: ${receipt.hash}`)
        break;
      } else if (receipt && receipt.status === 0) {
        console.log(`Tx failed, retrying...`)
        continue;
      }

    } catch (e: any) {
      console.log(e.message)
      await new Promise(r => setTimeout(r, 1_000))
      continue;
    }
  }
}

main()