import { expect, test } from "bun:test";
import { releaseVersion } from "./release-version";

test("only a root version change releases on push; manual runs can release the current version", () => {
  expect(releaseVersion("0.1.0", "0.1.0").changed).toBe(false);
  expect(releaseVersion("0.2.0", "0.1.0")).toEqual({ changed: true, version: "0.2.0", tag: "v0.2.0", prerelease: false });
  expect(releaseVersion("1.0.0-rc.1").prerelease).toBe(true);
  expect(releaseVersion("0.1.0").changed).toBe(true);
});
test.each(["01.2.3", "1.2", "v1.2.3", "1.2.3-01", "1.2.3+build", "../../bad", "1.2.3\n", undefined])("rejects invalid release version %s", version => {
  expect(() => releaseVersion(version)).toThrow();
});

test("version bumps must increase SemVer, including prerelease ordering", () => {
  expect(() => releaseVersion("0.1.0", "0.2.0")).toThrow("must increase");
  expect(releaseVersion("1.0.0-rc.2", "1.0.0-rc.1").changed).toBe(true);
  expect(releaseVersion("1.0.0", "1.0.0-rc.2").prerelease).toBe(false);
});
