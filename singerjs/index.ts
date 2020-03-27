import { exec, execSync, spawnSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as simplegit from "simple-git/promise";

interface Tap {
  startStream: () => void;

  // stopStream: () => void;
}

// There's loads more than these.
export type GitHubStreams = "comments" | "pull_requests";

export interface TapGitHubConfig {
  propPath: string;
  configPath: string;
  catalogPath: string;
}

interface ITapGitHubProps {
  propFilesPath: string;
  config: any;
  selectedStreams: GitHubStreams[];
}

export class TapGitHub implements Tap {
  public static gitUrl = "https://github.com/singer-io/tap-github";

  public static async create(props: ITapGitHubProps) {
    const { propFilesPath, config, selectedStreams } = props;
    const configPath = path.join(propFilesPath, "config.json");
    const catalogPath = path.join(propFilesPath, "catalog.json");
    fs.ensureDirSync(propFilesPath);

    // Install the tap and save the config.
    await spawnSync("python3", ["-m", "pip", "install", "tap-github"]);
    await fs.writeFile(configPath, JSON.stringify(config));

    // Discover streams and select desired streams.
    spawnSync("tap-github", ["--config", configPath, "--discover", ">", catalogPath], {
      shell: true
    });
    const catalog = await fs.readJson(catalogPath);
    catalog.streams = catalog.streams.filter((stream: any) =>
      selectedStreams.includes(stream.stream)
    );
    catalog.streams = catalog.streams.map((stream: any) => ({
      ...stream,
      schema: { ...stream.schema, selected: true }
    }));
    await fs.writeJSON(catalogPath, catalog);

    return new TapGitHub(configPath, catalogPath);
  }

  public readonly configPath: string;
  public readonly catalogPath: string;

  constructor(configPath: string, catalogPath: string) {
    this.configPath = configPath;
    this.catalogPath = catalogPath;
  }

  public startStream() {
    spawnSync("tap-github", ["--config", this.configPath, "--properties", this.catalogPath], {
      shell: true
    });
  }
}
