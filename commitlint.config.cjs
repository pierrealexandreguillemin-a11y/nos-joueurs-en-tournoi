module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce types used in this project's history
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'refactor', // code restructuring (no behavior change)
        'test',     // adding or updating tests
        'docs',     // documentation only
        'ci',       // CI/CD, build, tooling
        'perf',     // performance improvement
        'style',    // formatting, whitespace (no logic change)
        'chore',    // dependencies, configs, maintenance
      ],
    ],
    // Keep subject concise
    'subject-max-length': [2, 'always', 100],
  },
};
