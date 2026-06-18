import { create } from "zustand";
import {
  getStorybook,
  startStorybook,
  getTestState,
  runTests as apiRunTests,
  storybookDocsUrl,
  type StorybookState,
  type TestState,
} from "../lib/api";

interface ActionsStore {
  storybook: StorybookState;
  test: TestState;
  setStorybook: (s: StorybookState) => void;
  setTest: (t: TestState) => void;
}

export const useActions = create<ActionsStore>((set) => ({
  storybook: { status: "stopped", url: null },
  test: { status: "idle", lastExitCode: null },
  setStorybook: (storybook) => set({ storybook }),
  setTest: (test) => set({ test }),
}));

// Poll Storybook status until it's running (or errors), then run `onReady`.
async function pollStorybook(onReady?: (url: string) => void) {
  for (let i = 0; i < 120; i++) {
    const s = await getStorybook();
    useActions.getState().setStorybook(s);
    if (s.status === "running" && s.url) {
      onReady?.(s.url);
      return;
    }
    if (s.status === "error") return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function ensureStorybook(onReady?: (url: string) => void) {
  const current = await getStorybook();
  useActions.getState().setStorybook(current);
  if (current.status === "running" && current.url) {
    onReady?.(current.url);
    return;
  }
  await startStorybook();
  pollStorybook(onReady);
}

export async function openInStorybook(componentName: string) {
  await ensureStorybook((url) => {
    window.open(storybookDocsUrl(url, componentName), "_blank");
  });
}

export async function openStorybook() {
  await ensureStorybook((url) => window.open(url, "_blank"));
}

export async function triggerTests(filter?: string) {
  const started = await apiRunTests(filter);
  useActions.getState().setTest(started);
  // Poll until it settles.
  for (let i = 0; i < 600; i++) {
    const next = await getTestState();
    useActions.getState().setTest(next);
    if (next.status !== "running") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
}
