import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 15000,
    // Integration tests share a single Postgres/Redis/Elasticsearch instance and
    // (for some suites) real BullMQ queues/workers. Running test files in
    // parallel risks job-stealing between files and TRUNCATE races on shared
    // tables. Disabling file parallelism is defense-in-depth on top of the
    // per-file queue-name isolation used in the integration suites.
    fileParallelism: false,
  },
});
