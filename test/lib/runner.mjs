const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

export function createRunner({ filter = null } = {}) {
  const suites = [];
  let currentSuite = null;

  function suite(name, fn) {
    const entry = { name, tests: [] };
    suites.push(entry);
    const prev = currentSuite;
    currentSuite = entry;
    try {
      fn();
    } finally {
      currentSuite = prev;
    }
  }

  function test(name, fn) {
    if (!currentSuite) {
      throw new Error(`test("${name}") must be called inside suite(...)`);
    }
    currentSuite.tests.push({ name, fn });
  }

  async function run(ctx) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const failures = [];
    const suiteStart = Date.now();

    for (const s of suites) {
      const suiteMatches = !filter || s.name.toLowerCase().includes(filter.toLowerCase());
      const matchingTests = s.tests.filter(
        (t) => suiteMatches || t.name.toLowerCase().includes(filter.toLowerCase()),
      );

      if (matchingTests.length === 0) {
        skipped += s.tests.length;
        continue;
      }

      skipped += s.tests.length - matchingTests.length;
      console.log(`\n${ANSI.bold}${ANSI.cyan}=== ${s.name} ===${ANSI.reset}`);

      for (const t of matchingTests) {
        const t0 = Date.now();
        try {
          await t.fn(ctx);
          const ms = Date.now() - t0;
          passed++;
          console.log(`  ${ANSI.green}PASS${ANSI.reset} ${t.name} ${ANSI.dim}(${ms}ms)${ANSI.reset}`);
        } catch (err) {
          const ms = Date.now() - t0;
          failed++;
          console.log(`  ${ANSI.red}FAIL${ANSI.reset} ${t.name} ${ANSI.dim}(${ms}ms)${ANSI.reset}`);
          console.error(`       ${ANSI.red}${err?.message || err}${ANSI.reset}`);
          if (err?.stack) {
            const stackLines = String(err.stack).split('\n').slice(1, 6).join('\n');
            if (stackLines) console.error(`${ANSI.dim}${stackLines}${ANSI.reset}`);
          }
          failures.push({ suite: s.name, test: t.name, error: err });
        }
      }
    }

    const totalMs = Date.now() - suiteStart;
    console.log(`\n${ANSI.bold}----------------------------------------${ANSI.reset}`);
    console.log(
      `${ANSI.bold}Summary:${ANSI.reset} ` +
        `${ANSI.green}${passed} passed${ANSI.reset}, ` +
        `${failed > 0 ? ANSI.red : ANSI.dim}${failed} failed${ANSI.reset}, ` +
        `${ANSI.yellow}${skipped} skipped${ANSI.reset} ` +
        `${ANSI.dim}(${(totalMs / 1000).toFixed(2)}s)${ANSI.reset}`,
    );

    if (failures.length > 0) {
      console.log(`\n${ANSI.red}${ANSI.bold}Failures:${ANSI.reset}`);
      for (const f of failures) {
        console.log(`  - [${f.suite}] ${f.test}: ${f.error?.message || f.error}`);
      }
    }

    return { passed, failed, skipped, failures };
  }

  return { suite, test, run };
}
