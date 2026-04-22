import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_VAULT =
  "/Users/syang/Library/CloudStorage/GoogleDrive-syyangv@gmail.com/我的云端硬盘/obsidian_vaults/syang";

const pluginId = "obsidian-progress-frontmatter";
const vaultPath = process.env.OBSIDIAN_VAULT || DEFAULT_VAULT;
const pluginPath = join(vaultPath, ".obsidian", "plugins", pluginId);
const enabledPluginsPath = join(vaultPath, ".obsidian", "community-plugins.json");
const files = ["main.js", "manifest.json", "styles.css"];

await mkdir(pluginPath, { recursive: true });

await Promise.all(
  files.map((file) => copyFile(file, join(pluginPath, file))),
);

const enabledPlugins = JSON.parse(await readFile(enabledPluginsPath, "utf8"));
if (!enabledPlugins.includes(pluginId)) {
  enabledPlugins.push(pluginId);
  await writeFile(enabledPluginsPath, `${JSON.stringify(enabledPlugins, null, 2)}\n`);
}

console.log(`Deployed ${pluginId} to ${pluginPath}`);
