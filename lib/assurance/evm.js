import {
  Contract,
  JsonRpcProvider,
  Wallet,
  id,
  isAddress,
  solidityPackedKeccak256,
} from "ethers";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
const ABI = [
  "function writer() view returns (address)",
  "function digests(bytes32) view returns (bytes32)",
  "function streams(bytes32) view returns (uint64 count,bytes32 head)",
  "function anchor(bytes32,uint64,bytes32,bytes32)",
  "event Anchored(bytes32 indexed eventId,bytes32 indexed streamKey,uint64 sequence,bytes32 digest)",
];
export function validateEvmConfig(config) {
  if (
    !config.EVM_RPC_URL ||
    !config.EVM_PRIVATE_KEY ||
    !config.chainId ||
    !config.contractAddress
  )
    throw new Error("EVM_NOT_CONFIGURED");
  const url = new URL(config.EVM_RPC_URL);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local") ||
    (isIP(url.hostname) && ipaddr.parse(url.hostname).range() !== "unicast")
  )
    throw new Error("EVM_RPC_INVALID");
  if (
    !Number.isSafeInteger(config.chainId) ||
    config.chainId <= 0 ||
    !isAddress(config.contractAddress) ||
    !/^0x[a-f0-9]{64}$/i.test(config.EVM_PRIVATE_KEY) ||
    !Number.isInteger(config.confirmations ?? 3) ||
    (config.confirmations ?? 3) < 1 ||
    (config.confirmations ?? 3) > 64
  )
    throw new Error("EVM_CONFIG_INVALID");
  return { url: url.href, confirmations: config.confirmations ?? 3 };
}
export async function anchorEvm(
  entry,
  config,
  { transactionHash = null, onSubmitted = async () => {} } = {},
) {
  const { url, confirmations } = validateEvmConfig(config),
    provider = new JsonRpcProvider(url);
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(config.chainId))
      throw new Error("EVM_NETWORK_MISMATCH");
    if ((await provider.getCode(config.contractAddress)) === "0x")
      throw new Error("EVM_CONTRACT_MISSING");
    const wallet = new Wallet(config.EVM_PRIVATE_KEY, provider),
      contract = new Contract(config.contractAddress, ABI, wallet);
    if (
      (await contract.writer()).toLowerCase() !== wallet.address.toLowerCase()
    )
      throw new Error("EVM_WRITER_MISMATCH");
    const streamKey = id(`RELOO_HISTORY_V1:${entry.envelope.streamId}`),
      eventId = solidityPackedKeccak256(
        ["bytes32", "uint64"],
        [streamKey, entry.envelope.sequence],
      ),
      recordDigest = "0x" + entry.hash;
    const existing = await contract.digests(eventId);
    if (existing !== "0x" + "0".repeat(64) && existing !== recordDigest)
      throw new Error("EVM_DIGEST_CONFLICT");
    if (existing === recordDigest && !transactionHash)
      throw new Error("EVM_ANCHORED_RECEIPT_REQUIRED");
    let receipt;
    if (transactionHash) {
      receipt = await provider.waitForTransaction(
        transactionHash,
        confirmations,
        180000,
      );
    } else {
      if (
        !/^\d{1,20}$/.test(String(config.maxFeeWei || "")) ||
        BigInt(config.maxFeeWei) <= 0n
      )
        throw new Error("EVM_GAS_BUDGET_REQUIRED");
      const gas =
          ((await contract.anchor.estimateGas(
            streamKey,
            entry.envelope.sequence,
            "0x" + entry.envelope.previousHash,
            recordDigest,
          )) *
            12n) /
          10n,
        fees = await provider.getFeeData(),
        price = fees.maxFeePerGas || fees.gasPrice;
      if (!price || gas * price > BigInt(config.maxFeeWei))
        throw new Error("EVM_GAS_BUDGET_EXCEEDED");
      const limits = fees.maxFeePerGas
        ? {
            maxFeePerGas: fees.maxFeePerGas,
            maxPriorityFeePerGas: fees.maxPriorityFeePerGas || 0n,
          }
        : { gasPrice: fees.gasPrice };
      const transaction = await contract.anchor(
        streamKey,
        entry.envelope.sequence,
        "0x" + entry.envelope.previousHash,
        recordDigest,
        { gasLimit: gas, ...limits },
      );
      transactionHash = transaction.hash;
      await onSubmitted(transactionHash);
      receipt = await transaction.wait(confirmations, 180000);
    }
    if (
      !receipt ||
      receipt.status !== 1 ||
      receipt.to?.toLowerCase() !== config.contractAddress.toLowerCase() ||
      !receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== config.contractAddress.toLowerCase())
          return false;
        try {
          const parsed = contract.interface.parseLog(log);
          return (
            parsed?.name === "Anchored" &&
            parsed.args.eventId === eventId &&
            parsed.args.streamKey === streamKey &&
            parsed.args.digest === recordDigest &&
            parsed.args.sequence === BigInt(entry.envelope.sequence)
          );
        } catch {
          return false;
        }
      }) ||
      (await contract.digests(eventId)) !== recordDigest
    )
      throw new Error("EVM_RECEIPT_NOT_VERIFIED");
    return {
      status: "CONFIRMED",
      transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      eventId,
      digest: recordDigest,
      confirmations,
    };
  } finally {
    provider.destroy();
  }
}
export async function readEvmCheckpoint(streamId, config) {
  if (!config.EVM_RPC_URL || !config.chainId || !config.contractAddress)
    return null;
  const url = new URL(config.EVM_RPC_URL);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !isAddress(config.contractAddress) ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local") ||
    (isIP(url.hostname) && ipaddr.parse(url.hostname).range() !== "unicast")
  )
    throw new Error("EVM_CONFIG_INVALID");
  const provider = new JsonRpcProvider(url.href);
  try {
    if ((await provider.getNetwork()).chainId !== BigInt(config.chainId))
      throw new Error("EVM_NETWORK_MISMATCH");
    const contract = new Contract(config.contractAddress, ABI, provider),
      height = await provider.getBlockNumber(),
      blockTag = Math.max(0, height - (config.confirmations ?? 3) + 1),
      stream = await contract.streams(id(`RELOO_HISTORY_V1:${streamId}`), {
        blockTag,
      });
    return {
      count: Number(stream.count),
      head: stream.head.slice(2),
      blockNumber: blockTag,
      chainId: config.chainId,
    };
  } finally {
    provider.destroy();
  }
}
