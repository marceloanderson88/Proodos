import { describe, expect, it } from "vitest";

import {
  assertFileTransition,
  canTransitionFile,
  FileStateTransitionError,
} from "@/features/files/state-machine";

describe("máquina de estados de arquivos", () => {
  it("permite o caminho nominal e recuperação", () => {
    expect(canTransitionFile("pending", "uploading")).toBe(true);
    expect(canTransitionFile("uploading", "validating")).toBe(true);
    expect(canTransitionFile("validating", "available")).toBe(true);
    expect(canTransitionFile("failed", "pending")).toBe(true);
  });

  it("mantém purge terminal e impede atalhos", () => {
    expect(canTransitionFile("purged", "available")).toBe(false);
    expect(() => assertFileTransition("pending", "available")).toThrow(
      FileStateTransitionError,
    );
  });
});
