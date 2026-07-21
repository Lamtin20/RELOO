/**
 * Polygon / NFT Passport — hằng số & helper (client-safe)
 * API server: lib/polygon-api.js + GET /api/polygon/health
 */

export const POLYGON_INTEGRATION_STATUS = 'mock';

export const POLYGON_CHAIN = {
  id: 137,
  name: 'Polygon Mainnet',
  explorerTx: 'https://polygonscan.com/tx/',
  explorerAddress: 'https://polygonscan.com/address/',
};

export function polygonExplorerTxUrl(hash) {
  if (!hash) return null;
  return `${POLYGON_CHAIN.explorerTx}${hash}`;
}

export function isMockBlockchainHash(hash) {
  if (!hash) return true;
  return !/^0x[a-fA-F0-9]{64}$/.test(hash);
}
