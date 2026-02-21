import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.join(__dirname, "../src/components");

async function run() {
  try {
    const files = await fs.readdir(componentsDir);
    let failed = false;

    for (const file of files) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;

      const content = await fs.readFile(path.join(componentsDir, file), "utf8");

      // Guardrail 1: Ensure `cn` utility is used rather than raw template literals for classes if className is present.
      if (
        !content.includes("import { cn }") &&
        content.includes("className=")
      ) {
        console.error(
          `[Guard Guardrail Error] ${file}: Uses className but does not use the cn() utility. Shadcn components must compose styles using cn() / cva() instead of raw string interpolation.`,
        );
        failed = true;
      }

      // Guardrail 2: Ensure we don't accidentally import from internal feature paths.
      // (This is mostly for consumers but good to check internal hygiene too).
      if (content.includes('from "../../')) {
        console.warn(
          `[Guard Warning] ${file}: Avoid deep relative imports when composing shadcn primitives.`,
        );
      }
    }

    if (failed) {
      process.exit(1);
    } else {
      console.log("✅ packages/ui guardrails passed.");
    }
  } catch (err) {
    console.error("Failed to run guard script:", err);
    process.exit(1);
  }
}

run();
