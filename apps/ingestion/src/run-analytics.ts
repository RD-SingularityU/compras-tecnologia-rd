import { config } from "dotenv";
config({ path: "../../.env.local" });

import { calcularHhi } from "./analytics/hhi-calculator";
import { detectarRedFlags } from "./analytics/red-flags";

async function main() {
  console.log("=== Ejecutando analytics ===");
  await calcularHhi();
  await detectarRedFlags();
  console.log("=== Analytics completado ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
