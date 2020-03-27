import { exec, execSync, spawnSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as simplegit from "simple-git/promise";

interface Tap {
  // 1. Acquire tap (Clone repo).
  // 2. Discover, if catalog.json not available, apply streamable = true to desired streams.
  // 4. Start tap running.
  // 5. Periodically clear streamed data and upload.

  path: string;

  acquire: (config: any) => void;

  discover: () => void;

  // startStream: () => void;

  // stopStream: () => void;
}

// There's loads more than these.
export enum TapGitHubStreams {
  comments,
  pull_requests
}

export class TapGitHub implements Tap {
  public readonly gitUrl = "https://github.com/singer-io/tap-github";
  public readonly path: string;
  public readonly configPath: string;
  public readonly catalogPath: string;

  constructor(rootPath: string) {
    this.path = path.join(rootPath, "tap-github");
    fs.ensureDirSync(this.path);
    this.configPath = path.join(this.path, "config.json");
    this.catalogPath = path.join(this.path, "catalog.json");
  }

  public async setConfig(config: any) {
    await fs.writeFile(this.configPath, JSON.stringify(config));
  }

  public async acquire() {
    // await simplegit().clone(this.gitUrl, this.path);
    await spawnSync("python3", ["-m", "pip", "install", "tap-github"]);
  }

  public async discover() {
    spawnSync("tap-github", ["--config", this.configPath, "--discover", ">", this.catalogPath], {
      shell: true
    });
    const catalog = await fs.readJson(this.catalogPath);
  }

  private async git() {
    return await simplegit(this.path);
  }
}
