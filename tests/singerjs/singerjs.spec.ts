import { GitHubStreams, TapGitHub } from "@dataform/singerjs";
import { suite, test } from "@dataform/testing";
import { expect } from "chai";
import { TmpDirFixture } from "df/tests/utils/fixtures";
import * as fs from "fs-extra";
import * as path from "path";

suite("@dataform/singerjs", ({ beforeEach, afterEach }) => {
  const tmpDirFixture = new TmpDirFixture(afterEach);
  const tmpReferenceRootDir = tmpDirFixture.createNewTmpDir();

  test("Tap GitHub", async () => {
    const tapGitHub = await TapGitHub.create({
      propFilesPath: "tap-github",
      config: {
        access_token: "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
        repository: "singer-io/target-stitch"
      },
      selectedStreams: ["comments", "pull_requests"]
    });

    expect(await fs.pathExists(tapGitHub.configPath)).to.equal(true);
    expect(await fs.pathExists(tapGitHub.catalogPath)).to.equal(true);

    tapGitHub.startStream();
    await new Promise(resolve => setTimeout(() => resolve(), 3000));
    // TODO: Write state and new data, then pipe using df api incremental to warehouse.
  });
});
