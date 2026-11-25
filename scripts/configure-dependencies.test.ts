import { describe, expect, test } from 'bun:test';

import {
  applyDependencyReplacements,
  getPackageSwiftReplacements,
  getPodspecReplacements,
} from './configure-dependencies';

const defaultProviders = {
  google: 'implementation',
  facebook: 'implementation',
  apple: 'implementation',
  twitter: 'implementation',
} as const;

describe('configure-dependencies iOS GoogleSignIn 10.x', () => {
  test("podspec replacement pins GoogleSignIn '~> 10.1' when google is enabled", () => {
    const sample = `  # s.dependency 'GoogleSignIn', '~> 10.1'  # Disabled via config (compileOnly)\n`;
    const { content, modified } = applyDependencyReplacements(sample, getPodspecReplacements(defaultProviders));
    expect(modified).toBe(true);
    expect(content).toContain(`s.dependency 'GoogleSignIn', '~> 10.1'`);
    expect(content).not.toContain('9.0.0');
  });

  test('podspec replacement comments GoogleSignIn when google is compileOnly', () => {
    const sample = `  s.dependency 'GoogleSignIn', '~> 10.1'\n`;
    const config = { ...defaultProviders, google: 'compileOnly' };
    const { content, modified } = applyDependencyReplacements(sample, getPodspecReplacements(config));
    expect(modified).toBe(true);
    expect(content).toContain(`# s.dependency 'GoogleSignIn', '~> 10.1'`);
  });

  test('Package.swift Google package line without trailing comma matches at 10.1.0', () => {
    const sample = `// .package(url: "https://github.com/google/GoogleSignIn-iOS.git", .upToNextMajor(from: "10.1.0"))  // Disabled via config (compileOnly)
`;
    const { content, modified } = applyDependencyReplacements(sample, getPackageSwiftReplacements(defaultProviders));
    expect(modified).toBe(true);
    expect(content).toContain('.upToNextMajor(from: "10.1.0"))');
    expect(content.trimEnd()).not.toMatch(/,\s*$/);
  });

  test('Package.swift Google product line without trailing comma can be disabled', () => {
    const sample = `                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
`;
    const config = { ...defaultProviders, google: 'compileOnly' };
    const { content, modified } = applyDependencyReplacements(sample, getPackageSwiftReplacements(config));
    expect(modified).toBe(true);
    expect(content).toContain('// .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")');
    expect(content).toContain('Disabled via config (compileOnly)');
  });

  test('Package.swift can disable Google package when google is compileOnly', () => {
    const sample = `        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", .upToNextMajor(from: "10.1.0"))
`;
    const config = { ...defaultProviders, google: 'compileOnly' };
    const { content, modified } = applyDependencyReplacements(sample, getPackageSwiftReplacements(config));
    expect(modified).toBe(true);
    expect(content.trimStart()).toMatch(/^\/\/ \.package\(url: "https:\/\/github.com\/google\/GoogleSignIn-iOS\.git"/);
    expect(content).toContain('Disabled via config (compileOnly)');
  });
});
