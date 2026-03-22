"use client";

import { cn } from "@/lib/utils";
import {
  createSimpleStore,
  useSimpleStore,
  type SimpleStore,
} from "@passionware/simple-store";
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MouseEventHandler,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import { createPortal } from "react-dom";

const HIDE_DELAY_MS = 120;

export type PointerFollowTooltipConfig = {
  content: ReactNode;
  contentClassName?: string;
  light?: boolean;
  offsetX?: number;
  offsetY?: number;
  delayDuration?: number;
};

type Payload = {
  content: ReactNode;
  contentClassName?: string;
  light: boolean;
  offsetX: number;
  offsetY: number;
};

export type PointerFollowTooltipState = {
  activeBindingId: string | null;
  pendingBindingId: string | null;
  pendingConfig: PointerFollowTooltipConfig | null;
  open: boolean;
  fadingOut: boolean;
  pointer: { x: number; y: number };
  layout: { left: number; top: number } | null;
  payload: Payload | null;
  opacityPhase: "hidden" | "visible";
  positionTransition: boolean;
  /** Bump to invalidate in-flight opacity rAF. */
  opacitySession: number;
  skipPositionTransition: boolean;
};

export const initialPointerFollowTooltipState: PointerFollowTooltipState = {
  activeBindingId: null,
  pendingBindingId: null,
  pendingConfig: null,
  open: false,
  fadingOut: false,
  pointer: { x: 0, y: 0 },
  layout: null,
  payload: null,
  opacityPhase: "hidden",
  positionTransition: false,
  opacitySession: 0,
  skipPositionTransition: true,
};

type Timers = {
  show?: ReturnType<typeof setTimeout>;
  hide?: ReturnType<typeof setTimeout>;
};

/** Stable API from context — subscribe with {@link useSimpleStore} only where needed. */
export type PointerFollowTooltipApi = {
  store: SimpleStore<PointerFollowTooltipState>;
  timersRef: MutableRefObject<Timers>;
};

const PointerFollowTooltipContext =
  createContext<PointerFollowTooltipApi | null>(null);

function clearShowTimer(timersRef: MutableRefObject<Timers>) {
  if (timersRef.current.show !== undefined) {
    clearTimeout(timersRef.current.show);
    timersRef.current.show = undefined;
  }
}

function clearHideTimer(timersRef: MutableRefObject<Timers>) {
  if (timersRef.current.hide !== undefined) {
    clearTimeout(timersRef.current.hide);
    timersRef.current.hide = undefined;
  }
}

function closeImmediately(
  store: SimpleStore<PointerFollowTooltipState>,
  timersRef: MutableRefObject<Timers>,
) {
  clearShowTimer(timersRef);
  clearHideTimer(timersRef);
  store.setNewValue((prev) => ({
    ...initialPointerFollowTooltipState,
    opacitySession: prev.opacitySession + 1,
  }));
}

function startFadeOut(
  store: SimpleStore<PointerFollowTooltipState>,
  timersRef: MutableRefObject<Timers>,
) {
  clearHideTimer(timersRef);
  store.setNewValue((prev) => ({ ...prev, fadingOut: true }));
}

/** Imperative API for tests or custom triggers. */
export function pointerFollowTooltipActivate(
  store: SimpleStore<PointerFollowTooltipState>,
  timersRef: MutableRefObject<Timers>,
  bindingId: string,
  clientX: number,
  clientY: number,
  config: PointerFollowTooltipConfig,
) {
  clearHideTimer(timersRef);

  const offsetX = config.offsetX ?? 12;
  const offsetY = config.offsetY ?? 12;
  const delayDuration = config.delayDuration ?? 280;

  const resolved: Payload = {
    content: config.content,
    contentClassName: config.contentClassName,
    light: config.light ?? false,
    offsetX,
    offsetY,
  };

  const s = store.getCurrentValue();

  if (s.fadingOut) {
    clearShowTimer(timersRef);
    store.setNewValue((prev) => ({
      ...prev,
      fadingOut: false,
      activeBindingId: bindingId,
      payload: resolved,
      pointer: { x: clientX, y: clientY },
      open: true,
      opacityPhase: "visible",
      positionTransition: true,
      skipPositionTransition: false,
      pendingBindingId: null,
      pendingConfig: null,
    }));
    return;
  }

  if (s.open && s.activeBindingId === bindingId) {
    clearShowTimer(timersRef);
    store.setNewValue((prev) => ({
      ...prev,
      pointer: { x: clientX, y: clientY },
    }));
    return;
  }

  if (s.open && s.activeBindingId !== bindingId) {
    clearShowTimer(timersRef);
    store.setNewValue((prev) => ({
      ...prev,
      activeBindingId: bindingId,
      payload: resolved,
      pointer: { x: clientX, y: clientY },
      positionTransition: true,
      skipPositionTransition: false,
    }));
    return;
  }

  clearShowTimer(timersRef);
  store.setNewValue((prev) => ({
    ...prev,
    pointer: { x: clientX, y: clientY },
    pendingBindingId: bindingId,
    pendingConfig: config,
  }));

  timersRef.current.show = setTimeout(() => {
    timersRef.current.show = undefined;
    const cur = store.getCurrentValue();
    if (cur.pendingBindingId !== bindingId) return;
    const cfg = cur.pendingConfig;
    if (!cfg) return;

    const ox = cfg.offsetX ?? 12;
    const oy = cfg.offsetY ?? 12;
    store.setNewValue((prev) => ({
      ...prev,
      pendingBindingId: null,
      pendingConfig: null,
      activeBindingId: bindingId,
      payload: {
        content: cfg.content,
        contentClassName: cfg.contentClassName,
        light: cfg.light ?? false,
        offsetX: ox,
        offsetY: oy,
      },
      pointer: prev.pointer,
      open: true,
      fadingOut: false,
      layout: null,
      opacityPhase: "hidden",
      positionTransition: false,
      skipPositionTransition: true,
      opacitySession: prev.opacitySession + 1,
    }));
  }, delayDuration);
}

export function pointerFollowTooltipMove(
  store: SimpleStore<PointerFollowTooltipState>,
  _timersRef: MutableRefObject<Timers>,
  _bindingId: string,
  clientX: number,
  clientY: number,
) {
  store.setNewValue((prev) => ({
    ...prev,
    pointer: { x: clientX, y: clientY },
  }));
}

export function pointerFollowTooltipDeactivate(
  store: SimpleStore<PointerFollowTooltipState>,
  timersRef: MutableRefObject<Timers>,
  bindingId: string,
) {
  clearShowTimer(timersRef);
  const cur = store.getCurrentValue();
  if (cur.pendingBindingId === bindingId) {
    store.setNewValue((prev) => ({
      ...prev,
      pendingBindingId: null,
      pendingConfig: null,
    }));
  }
  if (cur.activeBindingId !== bindingId) return;

  clearHideTimer(timersRef);
  timersRef.current.hide = setTimeout(() => {
    timersRef.current.hide = undefined;
    const latest = store.getCurrentValue();
    if (latest.activeBindingId !== bindingId) return;
    startFadeOut(store, timersRef);
  }, HIDE_DELAY_MS);
}

function PointerFollowTooltipOverlay({
  store,
  timersRef,
}: {
  store: SimpleStore<PointerFollowTooltipState>;
  timersRef: MutableRefObject<Timers>;
}) {
  const state = useSimpleStore(store);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!state.open || !state.payload || state.fadingOut) return;
    const el = panelRef.current;
    if (!el) return;
    const margin = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = state.pointer.x + state.payload.offsetX;
    let top = state.pointer.y + state.payload.offsetY;
    left = Math.min(Math.max(margin, left), window.innerWidth - w - margin);
    top = Math.min(Math.max(margin, top), window.innerHeight - h - margin);

    const skipFirst = state.skipPositionTransition;

    store.setNewValue((prev) => {
      if (prev.layout?.left === left && prev.layout?.top === top) {
        return prev;
      }
      return { ...prev, layout: { left, top } };
    });

    if (skipFirst) {
      requestAnimationFrame(() => {
        store.setNewValue((prev) =>
          prev.skipPositionTransition
            ? {
                ...prev,
                skipPositionTransition: false,
                positionTransition: true,
              }
            : prev,
        );
      });
    }
  }, [
    store,
    state.open,
    state.fadingOut,
    state.pointer,
    state.payload,
    state.skipPositionTransition,
  ]);

  useEffect(() => {
    if (
      !state.open ||
      !state.layout ||
      state.fadingOut ||
      state.opacityPhase === "visible"
    )
      return;
    const session = state.opacitySession;
    const id = requestAnimationFrame(() => {
      const cur = store.getCurrentValue();
      if (cur.opacitySession !== session) return;
      store.setNewValue((p) =>
        p.opacityPhase === "visible" ? p : { ...p, opacityPhase: "visible" },
      );
    });
    return () => cancelAnimationFrame(id);
  }, [
    store,
    state.open,
    state.layout,
    state.fadingOut,
    state.opacityPhase,
    state.opacitySession,
  ]);

  const handleFadeOutEnd = (e: ReactTransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "opacity") return;
    if (!store.getCurrentValue().fadingOut) return;
    closeImmediately(store, timersRef);
  };

  const panel =
    state.open &&
    state.payload &&
    createPortal(
      <div
        ref={panelRef}
        role="tooltip"
        onTransitionEnd={handleFadeOutEnd}
        className={cn(
          "pointer-events-none fixed z-50",
          state.positionTransition &&
            "transition-[left,top] duration-150 ease-out",
          "transition-opacity duration-200",
          state.payload.light
            ? "overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
            : "rounded-md border border-border/90 bg-popover/90 px-3 py-1.5 text-sm text-popover-foreground shadow-sm shadow-black/30 backdrop-blur-xs",
          state.fadingOut || state.opacityPhase === "hidden"
            ? "opacity-0"
            : "opacity-100",
          state.payload.contentClassName,
        )}
        style={
          state.layout
            ? { left: state.layout.left, top: state.layout.top }
            : { left: 0, top: 0 }
        }
      >
        {state.payload.content}
      </div>,
      document.body,
    );

  return panel;
}

/**
 * Wraps app content with a stable context API; the tooltip portal is a **sibling** of
 * `{children}` so store-driven overlay updates do not reconcile inside the provider’s
 * child subtree (avoids re-rendering app routes/widgets on pointer move).
 */
export function PointerFollowTooltipProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createSimpleStore(initialPointerFollowTooltipState),
  );

  const timersRef = useRef<Timers>({});

  const ctxValue = useMemo<PointerFollowTooltipApi>(
    () => ({ store, timersRef }),
    [store],
  );

  useEffect(
    () => () => {
      clearShowTimer(timersRef);
      clearHideTimer(timersRef);
    },
    [],
  );

  return (
    <>
      <PointerFollowTooltipContext.Provider value={ctxValue}>
        {children}
      </PointerFollowTooltipContext.Provider>
      <PointerFollowTooltipOverlay store={store} timersRef={timersRef} />
    </>
  );
}

/** Context API (stable identity); does not subscribe — no re-renders from tooltip. */
export function usePointerFollowTooltipApi(): PointerFollowTooltipApi {
  const ctx = useContext(PointerFollowTooltipContext);
  if (!ctx) {
    throw new Error(
      "usePointerFollowTooltipApi must be used inside PointerFollowTooltipProvider",
    );
  }
  return ctx;
}

/**
 * Subscribe to tooltip state; only components that call this re-render on tooltip changes.
 * @example useSimpleStore(usePointerFollowTooltipStore())
 */
export function usePointerFollowTooltipStore(): SimpleStore<PointerFollowTooltipState> {
  return usePointerFollowTooltipApi().store;
}

/** Shorthand: same as `useSimpleStore(usePointerFollowTooltipStore())`. */
export function usePointerFollowTooltipState(): PointerFollowTooltipState {
  return useSimpleStore(usePointerFollowTooltipStore());
}

export type PointerFollowTooltipProps = {
  children: ReactElement;
  content: ReactNode;
  delayDuration?: number;
  offsetX?: number;
  offsetY?: number;
  light?: boolean;
  contentClassName?: string;
};

type MouseableChildProps = {
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onMouseMove?: MouseEventHandler;
};

/**
 * Merges pointer handlers with stable function identities so tooltip logic does not
 * force the child to re-render on every parent pass. Tooltip-driven updates only
 * re-render {@link PointerFollowTooltipOverlay} (store subscription).
 */
export function PointerFollowTooltip({
  children,
  content,
  delayDuration = 280,
  offsetX = 12,
  offsetY = 12,
  light,
  contentClassName,
}: PointerFollowTooltipProps) {
  const { store, timersRef } = usePointerFollowTooltipApi();
  const bindingId = useId();

  const storeRef = useRef(store);
  const timersRefOuter = useRef(timersRef);
  const bindingIdRef = useRef(bindingId);
  const childHandlersRef = useRef<MouseableChildProps>({});

  storeRef.current = store;
  timersRefOuter.current = timersRef;
  bindingIdRef.current = bindingId;

  const configRef = useRef({
    content,
    contentClassName,
    light,
    offsetX,
    offsetY,
    delayDuration,
  });
  configRef.current = {
    content,
    contentClassName,
    light,
    offsetX,
    offsetY,
    delayDuration,
  };

  const onEnterStable = useCallback((e: ReactMouseEvent) => {
    childHandlersRef.current.onMouseEnter?.(e);
    pointerFollowTooltipActivate(
      storeRef.current,
      timersRefOuter.current,
      bindingIdRef.current,
      e.clientX,
      e.clientY,
      configRef.current,
    );
  }, []);

  const onMoveStable = useCallback((e: ReactMouseEvent) => {
    childHandlersRef.current.onMouseMove?.(e);
    pointerFollowTooltipMove(
      storeRef.current,
      timersRefOuter.current,
      bindingIdRef.current,
      e.clientX,
      e.clientY,
    );
  }, []);

  const onLeaveStable = useCallback((e: ReactMouseEvent) => {
    childHandlersRef.current.onMouseLeave?.(e);
    pointerFollowTooltipDeactivate(
      storeRef.current,
      timersRefOuter.current,
      bindingIdRef.current,
    );
  }, []);

  if (!isValidElement(children)) {
    throw new Error("PointerFollowTooltip expects a single React element child");
  }

  const child = children as ReactElement<MouseableChildProps>;
  childHandlersRef.current = {
    onMouseEnter: child.props.onMouseEnter,
    onMouseLeave: child.props.onMouseLeave,
    onMouseMove: child.props.onMouseMove,
  };

  return cloneElement(child, {
    onMouseEnter: onEnterStable,
    onMouseLeave: onLeaveStable,
    onMouseMove: onMoveStable,
  });
}

/** Compound layout: `Provider` wraps the app; `Trigger` wraps each hover target. */
export const PointerFollowTooltipCompound = {
  Provider: PointerFollowTooltipProvider,
  Trigger: PointerFollowTooltip,
} as const;
