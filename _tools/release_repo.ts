// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { path, ReleasesMdFile, Repo, semver } from "./deps.ts";

const currentDirPath = path.dirname(path.fromFileUrl(import.meta.url));
export const rootDirPath = path.resolve(currentDirPath, "..");

export class VersionFile {
  #filePath: string;
  #fileJson: { version: string };

  static #versionRe = /^([0-9]+\.[0-9]+\.[0-9]+)$/;

  constructor() {
    this.#filePath = path.join(rootDirPath, "package.json");
    this.#fileJson = JSON.parse(Deno.readTextFileSync(this.#filePath));
  }

  get version() {
    const version = VersionFile.#versionRe.exec(this.#fileJson.version);
    if (version === null) {
      throw new Error(`Could not find version in text`);
    } else {
      return semver.parse(version[1])!;
    }
  }

  updateVersion(version: semver.SemVer) {
    this.#fileJson.version = version.toString();
    Deno.writeTextFileSync(
      this.#filePath,
      JSON.stringify(this.#fileJson, null, 2),
    );
  }
}

export function loadRepo() {
  return Repo.load({
    name: "nifty-lil-tricks-monitoring",
    path: rootDirPath,
  });
}

export function getReleasesMdFile() {
  return new ReleasesMdFile(path.join(rootDirPath, "./Releases.md"));
}
