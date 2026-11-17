/**
 * Print the addresses friends on the same network can open, then exit.
 * Run by `npm run start:lan` / `npm run dev:lan` before the server starts.
 */
import { networkInterfaces } from "node:os";

const port = process.env.PORT || "3000";
const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((a): a is NonNullable<typeof a> => !!a && a.family === "IPv4" && !a.internal)
  .map((a) => a.address);

console.log("\n  Chùa Online — local mode (data saved in ./data)");
console.log(`  On this machine:  http://localhost:${port}`);
if (addresses.length === 0) console.log("  No network address found — are you connected to Wi-Fi/LAN?");
for (const ip of addresses) console.log(`  For friends:      http://${ip}:${port}`);
console.log("  (Allow Node.js through the firewall when Windows asks, on Private networks.)\n");
