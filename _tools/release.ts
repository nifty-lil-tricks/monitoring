#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net --allow-run=git,npm --no-check

// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { containsVersion, createOctoKit, getGitHubRepository } from "./deps.ts";
import { getReleasesMdFile, loadRepo, VersionFile } from "./release_repo.ts";

const repo = await loadRepo();

// only run this for commits that contain a version number in the commit message
if (!containsVersion(await repo.gitCurrentCommitMessage())) {
  console.log("Exiting: No version found in commit name.");
  Deno.exit();
}

// ensure this is the main branch
if ((await repo.gitCurrentBranch()) !== "main") {
  console.log("Exiting: Not on main branch.");
  Deno.exit();
}

// now attempt to create a release by tagging
// the repo and creating a draft release
const versionFile = new VersionFile();
const releasesMd = getReleasesMdFile();

await repo.gitFetchTags("origin");
const repoTags = await repo.getGitTags();
const tagName = versionFile.version.toString();

if (repoTags.has(tagName)) {
  console.log(`Tag ${tagName} already exists.`);
} else {
  console.log(`Tagging ${tagName}...`);
  await repo.gitTag(tagName);
  await repo.gitPush("origin", tagName);

  await publishNpm();

  console.log(`Creating GitHub release...`);
  await createOctoKit().request(`POST /repos/{owner}/{repo}/releases`, {
    ...getGitHubRepository(),
    tag_name: tagName,
    name: tagName,
    body: releasesMd.getLatestReleaseText().fullText,
    draft: true,
  });
}

async function publishNpm(): Promise<void> {
  const pkgName = "@nifty-lil-tricks/monitoring";
  console.log(`Publishing ${pkgName} to npm...`);
  const command = new Deno.Command("npm", {
    args: ["publish", "--access", "public"],
  });
  const output = await command.output();
  if (!output.success) {
    console.log(`Failed to publish ${pkgName} to npm.`);
    console.log("Stderr:", new TextDecoder().decode(output.stderr));
    Deno.exit(1);
  }
}
