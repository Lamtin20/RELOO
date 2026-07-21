/**
 * Polygon PoS — Etherscan API v2 (chainid=137)
 * Docs: https://docs.etherscan.io/v2-migration
 */

const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api';
export const POLYGON_CHAIN_ID = 137;

function getApiKey() {
  return process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '';
}

export function isPolygonApiConfigured() {
  return Boolean(getApiKey());
}

async function polygonScanRequest(params) {
  const apikey = getApiKey();
  if (!apikey) {
    throw new Error('Chưa cấu hình POLYGONSCAN_API_KEY trong biến môi trường.');
  }

  const url = new URL(ETHERSCAN_V2_BASE);
  url.searchParams.set('chainid', String(POLYGON_CHAIN_ID));
  url.searchParams.set('apikey', apikey);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Polygon API HTTP ${res.status}`);
  }

  const data = await res.json();
  return data;
}

/** Kiểm tra kết nối — lấy block mới nhất trên Polygon */
export async function checkPolygonConnection() {
  const apikey = getApiKey();
  if (!apikey) {
    return {
      ok: false,
      configured: false,
      chainId: POLYGON_CHAIN_ID,
      message: 'Thiếu POLYGONSCAN_API_KEY',
    };
  }

  try {
    const data = await polygonScanRequest({
      module: 'proxy',
      action: 'eth_blockNumber',
    });

    const blockHex = data.result;
    if (blockHex && /^0x/i.test(String(blockHex))) {
      const blockNumber = parseInt(blockHex, 16);
      return {
        ok: true,
        configured: true,
        chainId: POLYGON_CHAIN_ID,
        chainName: 'Polygon Mainnet',
        blockNumber,
        blockHex,
        message: 'Kết nối Polygon API thành công',
      };
    }

    if (data.status === '0') {
      return {
        ok: false,
        configured: true,
        chainId: POLYGON_CHAIN_ID,
        message: data.result || data.message || 'API trả về lỗi',
        raw: data,
      };
    }

    return {
      ok: false,
      configured: true,
      chainId: POLYGON_CHAIN_ID,
      message: 'Phản hồi API không hợp lệ',
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      chainId: POLYGON_CHAIN_ID,
      message: err.message || 'Không kết nối được Polygon API',
    };
  }
}

/** Tra cứu giao dịch trên Polygon */
export async function getPolygonTransaction(hash) {
  if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return { ok: false, message: 'Hash giao dịch không hợp lệ' };
  }

  const data = await polygonScanRequest({
    module: 'proxy',
    action: 'eth_getTransactionByHash',
    txhash: hash,
  });

  if (!data.result || data.result === null) {
    return { ok: false, found: false, hash, message: 'Không tìm thấy giao dịch trên Polygon' };
  }

  return {
    ok: true,
    found: true,
    hash,
    transaction: data.result,
  };
}

/** Trạng thái NFT Passport — kết nối mạng + xác minh hash */
export async function getPolygonPassportStatus(hash) {
  const health = await checkPolygonConnection();

  if (!hash) {
    return {
      ...health,
      passport: {
        hash: null,
        onChainVerified: false,
        status: 'missing',
        statusLabel: 'Chưa có hash passport',
      },
    };
  }

  const isValidFormat = /^0x[a-fA-F0-9]{64}$/.test(hash);
  if (!isValidFormat) {
    return {
      ...health,
      passport: {
        hash,
        onChainVerified: false,
        status: 'invalid',
        statusLabel: 'Hash không đúng định dạng',
      },
    };
  }

  if (!health.ok) {
    return {
      ...health,
      passport: {
        hash,
        onChainVerified: false,
        status: 'offline',
        statusLabel: health.configured ? 'Không kết nối được Polygon' : 'Chưa cấu hình API',
      },
    };
  }

  try {
    const tx = await getPolygonTransaction(hash);
    if (tx.found) {
      return {
        ...health,
        passport: {
          hash,
          onChainVerified: true,
          status: 'verified',
          statusLabel: 'Đã xác minh trên Polygon',
        },
      };
    }
    return {
      ...health,
      passport: {
        hash,
        onChainVerified: false,
        status: 'pending',
        statusLabel: 'Hash nội bộ — chờ mint on-chain',
      },
    };
  } catch {
    return {
      ...health,
      passport: {
        hash,
        onChainVerified: false,
        status: 'pending',
        statusLabel: 'Hash nội bộ — chờ mint on-chain',
      },
    };
  }
}
