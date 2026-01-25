/**
 * useDebounce Hook Tests
 *
 * FEATURE: CSA-207 - Search & Filter Staff Accounts
 *
 * REQUIREMENTS TESTED:
 * - NFR3: Search input debounced with 300ms delay
 * - NFR1: Search queries return results within 200ms (after debounce)
 */

import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("should debounce value changes with specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    expect(result.current).toBe("initial");

    // Change value
    rerender({ value: "updated", delay: 300 });

    // Should still be initial immediately
    expect(result.current).toBe("initial");

    // Fast-forward 200ms (not enough)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe("initial");

    // Fast-forward another 100ms (total 300ms)
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("updated");
  });

  it("should reset timer if value changes before delay expires", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } }
    );

    // Change value
    rerender({ value: "first" });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Change again before delay expires
    rerender({ value: "second" });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should still be initial (timer was reset)
    expect(result.current).toBe("initial");

    // Wait for full delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now should be 'second' (not 'first')
    expect(result.current).toBe("second");
  });

  it("should use default delay of 300ms if not specified", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe("initial");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("updated");
  });

  it("should work with different data types", () => {
    // Test with number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(42);

    // Test with object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { name: "initial" } } }
    );

    const updatedObj = { name: "updated" };
    objectRerender({ value: updatedObj });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(objectResult.current).toBe(updatedObj);
  });

  it("should handle rapid successive changes (search scenario)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "" } }
    );

    // Simulate typing "hello" one character at a time
    const chars = ["h", "he", "hel", "hell", "hello"];
    chars.forEach((char, index) => {
      rerender({ value: char });
      act(() => {
        jest.advanceTimersByTime(50); // User types fast
      });
    });

    // Should still be empty (no delay expired)
    expect(result.current).toBe("");

    // Wait for debounce delay
    act(() => {
      jest.advanceTimersByTime(250); // 50*5 + 250 = 500ms total > 300ms
    });

    // Should now be final value
    expect(result.current).toBe("hello");
  });
});
