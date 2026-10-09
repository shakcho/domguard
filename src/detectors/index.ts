import type { Detector, DetectorId } from "../types.js";
import { scrollLoop } from "./scroll-loop.js";
import { clickLoop } from "./click-loop.js";
import { infiniteLoop } from "./infinite-loop.js";
import { recursiveFn } from "./recursive-fn.js";
import { mutationObserverFeedback } from "./mutation-observer-feedback.js";
import { eventDispatchLoop } from "./event-dispatch-loop.js";
import { setIntervalLeak } from "./setinterval-leak.js";

/**
 * The full detector registry, keyed by stable id. Iteration order matches
 * the order issues are reported in.
 */
export const detectors: Record<DetectorId, Detector> = {
  "scroll-loop": scrollLoop,
  "click-loop": clickLoop,
  "infinite-loop": infiniteLoop,
  "recursive-fn": recursiveFn,
  "mutation-observer-feedback": mutationObserverFeedback,
  "event-dispatch-loop": eventDispatchLoop,
  "setinterval-leak": setIntervalLeak,
};

/** The set of all detector ids in their canonical reporting order. */
export const ALL_DETECTORS: DetectorId[] = Object.keys(detectors) as DetectorId[];
