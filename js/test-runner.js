'use strict';

// ── Minimal test runner ────────────────────────────────────────────────────
// No dependencies. Returns structured results for rendering.

const TestRunner = (() => {
  const suites = [];
  let currentSuite = null;

  function describe(label, fn) {
    const suite = { label, tests: [], beforeEach: null };
    suites.push(suite);
    const prev = currentSuite;
    currentSuite = suite;
    fn();
    currentSuite = prev;
  }

  function beforeEach(fn) {
    if (currentSuite) currentSuite.beforeEach = fn;
  }

  function it(label, fn) {
    if (!currentSuite) throw new Error('it() called outside describe()');
    currentSuite.tests.push({ label, fn });
  }

  // ── Assertion helpers ────────────────────────────────────────────────────

  function expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new Error(`expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
        }
      },
      toEqual(expected) {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a !== b) {
          throw new Error(`expected\n  ${a}\nto equal\n  ${b}`);
        }
      },
      toContain(item) {
        const has = Array.isArray(actual)
          ? actual.includes(item)
          : String(actual).includes(String(item));
        if (!has) {
          throw new Error(`expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
        }
      },
      toHaveLength(n) {
        if ((actual || []).length !== n) {
          throw new Error(`expected length ${(actual || []).length} to be ${n}`);
        }
      },
      toBeGreaterThan(n) {
        if (!(actual > n)) {
          throw new Error(`expected ${actual} to be > ${n}`);
        }
      },
      toBeGreaterThanOrEqual(n) {
        if (!(actual >= n)) {
          throw new Error(`expected ${actual} to be >= ${n}`);
        }
      },
      toBeLessThan(n) {
        if (!(actual < n)) {
          throw new Error(`expected ${actual} to be < ${n}`);
        }
      },
      toBeNull() {
        if (actual !== null) {
          throw new Error(`expected ${JSON.stringify(actual)} to be null`);
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`expected ${JSON.stringify(actual)} to be truthy`);
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`expected ${JSON.stringify(actual)} to be falsy`);
        }
      },
      toMatchObject(expected) {
        for (const [k, v] of Object.entries(expected)) {
          if (JSON.stringify(actual[k]) !== JSON.stringify(v)) {
            throw new Error(`expected .${k} to be ${JSON.stringify(v)}, got ${JSON.stringify(actual[k])}`);
          }
        }
      }
    };
  }

  // ── Runner ────────────────────────────────────────────────────────────────

  async function run(onProgress) {
    const results = [];

    for (const suite of suites) {
      const suiteResult = { label: suite.label, tests: [], pass: 0, fail: 0 };

      for (const test of suite.tests) {
        if (suite.beforeEach) {
          try { await suite.beforeEach(); } catch (e) { /* ignore setup errors */ }
        }

        const start = performance.now();
        try {
          await test.fn({ expect });
          const ms = Math.round(performance.now() - start);
          suiteResult.tests.push({ label: test.label, status: 'pass', ms });
          suiteResult.pass++;
        } catch (err) {
          const ms = Math.round(performance.now() - start);
          suiteResult.tests.push({ label: test.label, status: 'fail', error: err.message, ms });
          suiteResult.fail++;
        }

        if (onProgress) onProgress();
      }

      results.push(suiteResult);
    }

    return results;
  }

  return { describe, beforeEach, it, run };
})();

// Export globals
window.describe  = TestRunner.describe;
window.beforeEach = TestRunner.beforeEach;
window.it        = TestRunner.it;
window.runTests  = TestRunner.run;
