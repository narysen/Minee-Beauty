const QRCode = require("qrcode");

const {
  BakongKHQR,
  IndividualInfo,
  khqrData
} = require("bakong-khqr");

class KHQRServiceError extends Error {}

function requireEnvironmentValue(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new KHQRServiceError(
      `${name} is not configured.`
    );
  }

  return value;
}

function getPositiveInteger(name, fallback) {
  const value = Number.parseInt(process.env[name], 10);

  return Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function normalizeUsdAmount(amount) {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new KHQRServiceError(
      "A valid payment amount is required."
    );
  }

  return Number(numericAmount.toFixed(2));
}

async function generateIndividualKHQR(
  amount,
  paymentReference
) {
  const accountId = requireEnvironmentValue(
    "KHQR_ACCOUNT_ID"
  );

  const accountName = requireEnvironmentValue(
    "KHQR_ACCOUNT_NAME"
  );

  const accountCity = requireEnvironmentValue(
    "KHQR_ACCOUNT_CITY"
  );

  const currency = requireEnvironmentValue(
    "KHQR_CURRENCY"
  ).toUpperCase();

  if (currency !== "USD") {
    throw new KHQRServiceError(
      "Only USD KHQR payments are supported."
    );
  }

  const finalAmount = normalizeUsdAmount(amount);
  const expireMinutes = getPositiveInteger(
    "KHQR_EXPIRE_MINUTES",
    10
  );

  if (expireMinutes > 10) {
    throw new KHQRServiceError(
      "KHQR expiration cannot exceed 10 minutes."
    );
  }

  const expiresAt = new Date(
    Date.now() + expireMinutes * 60 * 1000
  );

  const reference = String(
    paymentReference || ""
  ).trim();

  if (!reference) {
    throw new KHQRServiceError(
      "A payment reference is required."
    );
  }

  const individualInfo = new IndividualInfo(
    accountId,
    accountName,
    accountCity,
    {
      currency: khqrData.currency.usd,
      amount: finalAmount,
      billNumber: reference,
      storeLabel: "Minee Beauty",
      terminalLabel: "WEB",
      purposeOfTransaction: "Online order",
      expirationTimestamp: expiresAt.getTime()
    }
  );

  const khqr = new BakongKHQR();
  const result = khqr.generateIndividual(
    individualInfo
  );

  if (
    result?.status?.code !== 0 ||
    !result?.data?.qr ||
    !result?.data?.md5
  ) {
    throw new KHQRServiceError(
      result?.status?.message ||
      "KHQR generation failed."
    );
  }

  const qrImage = await QRCode.toDataURL(
    result.data.qr,
    {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    }
  );

  return {
    qr: result.data.qr,
    md5: result.data.md5,
    qrImage,
    amount: finalAmount,
    currency: "USD",
    receiverAccount: accountId,
    expiresAt
  };
}

async function verifyTransactionByMd5(md5) {
  const cleanMd5 = String(md5 || "").trim();

  if (!/^[a-f0-9]{32}$/i.test(cleanMd5)) {
    throw new KHQRServiceError(
      "A valid KHQR MD5 value is required."
    );
  }

  const baseUrl = requireEnvironmentValue(
    "BAKONG_API_BASE_URL"
  ).replace(/\/+$/, "");

  const token = requireEnvironmentValue(
    "BAKONG_API_TOKEN"
  );

  let response;

  try {
    response = await fetch(
      `${baseUrl}/v1/check_transaction_by_md5`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          md5: cleanMd5
        }),
        signal: AbortSignal.timeout(10000)
      }
    );
  } catch (error) {
    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError"
    ) {
      throw new KHQRServiceError(
        "Bakong verification timed out."
      );
    }

    throw new KHQRServiceError(
      "Cannot connect to the Bakong Open API."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new KHQRServiceError(
      "Bakong returned invalid JSON."
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new KHQRServiceError(
      "Bakong rejected the API credentials."
    );
  }

  if (!response.ok) {
    throw new KHQRServiceError(
      data.responseMessage ||
      data.message ||
      `Bakong verification failed (${response.status}).`
    );
  }

  if (
    String(data.responseCode) === "0" &&
    data.data
  ) {
    return {
      verified: true,
      transaction: data.data
    };
  }

  if (
    String(data.responseCode) === "1" &&
    !data.data
  ) {
    return {
      verified: false,
      transaction: null
    };
  }

  throw new KHQRServiceError(
    data.responseMessage ||
    data.message ||
    "Bakong returned an unknown verification result."
  );
}

module.exports = {
  KHQRServiceError,
  generateIndividualKHQR,
  verifyTransactionByMd5
};