import { TapGitHub } from "@dataform/singerjs";
import { suite, test } from "@dataform/testing";
import { expect } from "chai";
import { TmpDirFixture } from "df/tests/utils/fixtures";
import * as fs from "fs-extra";
import * as path from "path";

suite("@dataform/singerjs", ({ beforeEach, afterEach }) => {
  const tmpDirFixture = new TmpDirFixture(afterEach);
  const tmpReferenceRootDir = tmpDirFixture.createNewTmpDir();

  test("Tap GitHub", async () => {
    const tapGitHub = new TapGitHub(tmpReferenceRootDir);
    expect(await fs.pathExists(tapGitHub.path)).to.equal(true);

    await tapGitHub.setConfig({
      access_token: "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
      repository: "singer-io/target-stitch"
    });
    const configWritten = await fs.pathExists(tapGitHub.configPath);
    expect(configWritten).to.equal(true);

    await tapGitHub.acquire();

    console.log(await fs.readdir(tapGitHub.path));
    await tapGitHub.discover();
    console.log(await fs.readdir(tapGitHub.path));
    expect(await fs.existsSync(tapGitHub.catalogPath)).to.equal(true);

    const contents = await fs.readJson(tapGitHub.catalogPath);
    console.log("contents", contents);
    expect(true).to.equal(false);
  });
});
