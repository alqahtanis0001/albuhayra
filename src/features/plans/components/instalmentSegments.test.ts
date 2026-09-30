import { describe, expect, it } from "vitest";

import { hasGap, popoverEdge, segmentState } from "./instalmentSegments";

describe("segmentState (v1.3 item 7, ruling S1)", () => {
  it("maps each status 1:1", () => {
    expect(segmentState("PAID")).toEqual({ tone: "in", fill: 1 });
    expect(segmentState("PARTIAL")).toEqual({ tone: "in", fill: 0.5 });
    expect(segmentState("OVERDUE")).toEqual({ tone: "out", fill: 1 });
    expect(segmentState("DUE")).toEqual({ tone: "amber", fill: 1 });
    expect(segmentState("UPCOMING")).toEqual({ tone: "grey", fill: 1 });
  });
});

describe("hasGap", () => {
  it("keeps the gap up to 24 segments and drops it above", () => {
    expect(hasGap(1)).toBe(true);
    expect(hasGap(24)).toBe(true);
    expect(hasGap(25)).toBe(false);
  });
});

describe("popoverEdge", () => {
  it("opens inward from both ends", () => {
    expect(popoverEdge(0, 4)).toBe("start");
    expect(popoverEdge(1, 4)).toBe("start");
    expect(popoverEdge(2, 4)).toBe("end");
    expect(popoverEdge(3, 4)).toBe("end");
    expect(popoverEdge(0, 1)).toBe("start");
    expect(popoverEdge(1, 3)).toBe("start");
    expect(popoverEdge(2, 3)).toBe("end");
  });
});
