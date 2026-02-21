import fs from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const binDirectory = path.join(repositoryRoot, "resources", "bin");
const requiredArtifacts = ["uv", "uv.exe"];

if (!fs.existsSync(binDirectory)) {
  fs.mkdirSync(binDirectory, { recursive: true });
}

for (const artifactName of requiredArtifacts) {
  const artifactPath = path.join(binDirectory, artifactName);
  if (!fs.existsSync(artifactPath)) {
    fs.writeFileSync(
      artifactPath,
      `Placeholder for ${artifactName}. Replace with platform-specific uv binary during release packaging.`,
      "utf8",
    );
  }
}

console.log("Bundled uv placeholders are present:", requiredArtifacts.join(", "));
