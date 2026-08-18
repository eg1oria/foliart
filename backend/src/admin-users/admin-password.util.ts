import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCHEME = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

// scrypt with N=16384 needs a little over 16 MiB; the default 32 MiB limit
// would reject anything larger, so the budget is stated explicitly.
const MAX_MEMORY_BYTES = 64 * 1024 * 1024;

type ScryptParameters = {
  blockSize: number;
  cost: number;
  parallelization: number;
};

function derive(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_BYTES,
      {
        N: parameters.cost,
        r: parameters.blockSize,
        p: parameters.parallelization,
        maxmem: MAX_MEMORY_BYTES,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

// Format: scrypt$<cost>$<blockSize>$<parallelization>$<saltB64>$<hashB64>.
// Parameters travel with the hash so they can be raised later without a
// migration: old hashes keep verifying with the values they were made with.
export async function hashAdminPassword(password: string) {
  const salt = randomBytes(SALT_BYTES);
  const parameters: ScryptParameters = {
    cost: COST,
    blockSize: BLOCK_SIZE,
    parallelization: PARALLELIZATION,
  };
  const derivedKey = await derive(password, salt, parameters);

  return [
    SCHEME,
    parameters.cost,
    parameters.blockSize,
    parameters.parallelization,
    salt.toString('base64'),
    derivedKey.toString('base64'),
  ].join('$');
}

function parseStoredHash(stored: string) {
  const [scheme, cost, blockSize, parallelization, salt, hash] =
    stored.split('$');

  if (scheme !== SCHEME || !salt || !hash) {
    return null;
  }

  const parameters = {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  };

  if (
    !Number.isInteger(parameters.cost) ||
    !Number.isInteger(parameters.blockSize) ||
    !Number.isInteger(parameters.parallelization) ||
    parameters.cost < 2 ||
    parameters.blockSize < 1 ||
    parameters.parallelization < 1
  ) {
    return null;
  }

  try {
    return {
      parameters,
      salt: Buffer.from(salt, 'base64'),
      hash: Buffer.from(hash, 'base64'),
    };
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(password: string, stored: string) {
  const parsed = parseStoredHash(stored);

  if (!parsed || parsed.hash.length !== KEY_BYTES) {
    return false;
  }

  const derivedKey = await derive(password, parsed.salt, parsed.parameters);

  return timingSafeEqual(derivedKey, parsed.hash);
}

// Verifying against a throwaway hash keeps the response time of an unknown
// login in the same range as a known one, so the login list cannot be probed.
const decoyHashPromise = hashAdminPassword(randomBytes(24).toString('hex'));

export async function burnAdminPasswordTiming(password: string) {
  await verifyAdminPassword(password, await decoyHashPromise);
}
