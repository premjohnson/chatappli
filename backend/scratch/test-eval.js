import { createClient } from "redis";
import config from "../src/config/index.js";

async function run() {
  const client = createClient({ url: config.redis.url });
  await client.connect();

  const rateKey = "test:rate:limit:key";
  await client.del(rateKey);

  const script = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return current
  `;

  try {
    const val1 = await client.eval(script, {
      keys: [rateKey],
      arguments: ["5"],
    });
    console.log("Val 1 (should be 1):", val1);

    const val2 = await client.eval(script, {
      keys: [rateKey],
      arguments: ["5"],
    });
    console.log("Val 2 (should be 2):", val2);

    const ttl = await client.ttl(rateKey);
    console.log("TTL (should be around 5):", ttl);
  } catch (err) {
    console.error("Error running eval:", err);
  } finally {
    await client.quit();
  }
}

run();
