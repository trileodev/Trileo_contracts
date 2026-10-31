import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { root } from "./test-helpers.js";

describe("versioned subject registry", () => {
  it("contains unique lowercase versioned subjects", async () => {
    const registry = JSON.parse(await readFile(resolve(root, "subjects/v1.json"), "utf8")) as Record<string, string>;
    const values = Object.values(registry);
    expect(values.length).toBe(55);
    expect(registry.projectsRestore).toBe("projects.restore.v1");
    expect(registry.organizationsCreate).toBe("organizations.create.v1");
    expect(registry.organizationProjectsCreate).toBe("projects.create.v2");
    expect(registry.projectCollaboratorsAdd).toBe("collaborators.add.v1");
    expect(registry.uploadsGet).toBe("uploads.get.v1");
    expect(registry.uploadsList).toBe("uploads.list.v1");
    expect(values).not.toContain("uploads.create.v1");
    expect(new Set(values).size).toBe(values.length);
    for (const subject of values) expect(subject).toMatch(/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*\.v[12]$/);
  });
});
