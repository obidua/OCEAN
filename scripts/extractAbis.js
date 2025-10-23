#!/usr/bin/env node

/**
 * Combine contract ABIs from multiple directories into a single JSON file.
 *
 * Usage:
 *   node scripts/extractAbis.js [outputPath] [dir1 dir2 ...]
 *
 * Defaults:
 *   outputPath -> ./combined-abis.json
 *   directories -> ./abis, ./apps/dashboard/store/Contract_ABI
 */

import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import { id as keccakId } from 'ethers';

const DEFAULT_COMBINED_OUTPUT = 'combined-abis.json';
const DEFAULT_FUNCTIONS_OUTPUT = 'abi-functions-index.json';
const DEFAULT_DIRECTORIES = [
  'abis',
  path.join('apps', 'dashboard', 'store', 'Contract_ABI'),
];

async function main() {
  const args = process.argv.slice(2);

  const combinedOutput = args[0] ?? DEFAULT_COMBINED_OUTPUT;
  const functionsOutput = args[1] ?? DEFAULT_FUNCTIONS_OUTPUT;
  const searchDirs = args.length > 2 ? args.slice(2) : DEFAULT_DIRECTORIES;

  const rootDir = path.dirname(url.fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(rootDir, '..');

  const combined = {};
  const seen = new Set();
  const errors = [];

  for (const dir of searchDirs) {
    const absDir = path.resolve(repoRoot, dir);
    try {
      const entries = await fs.readdir(absDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
        const baseName = path.basename(entry.name, '.json');
        if (baseName.toLowerCase().includes('metadata')) {
          continue;
        }
        const key = baseName;
        const filePath = path.join(absDir, entry.name);

        if (seen.has(key)) {
          continue;
        }

        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          const abi = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.abi)
            ? parsed.abi
            : null;

          if (!abi) {
            errors.push(`Skipping ${filePath} – unable to determine ABI array.`);
            continue;
          }

          combined[key] = abi;
          seen.add(key);
        } catch (err) {
          errors.push(`Failed to parse ${filePath}: ${err.message}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to read directory ${absDir}: ${err.message}`);
    }
  }

  const combinedSummary = {
    generatedAt: new Date().toISOString(),
    sourceDirectories: searchDirs,
    contractCount: Object.keys(combined).length,
    contracts: combined,
    warnings: errors,
  };

  const combinedOutputAbs = path.resolve(repoRoot, combinedOutput);
  await fs.writeFile(
    combinedOutputAbs,
    JSON.stringify(
      combinedSummary,
      null,
      2
    ),
    'utf-8'
  );

  const functionsIndex = {};
  let functionTotal = 0;

  Object.entries(combined).forEach(([contractName, abiArray]) => {
    let ordinal = 0;
    abiArray.forEach((item) => {
      if (item?.type !== 'function' || !item?.name) return;
      ordinal += 1;
      functionTotal += 1;
      const signature = `${item.name}(${(item.inputs ?? [])
        .map((input) => input.type ?? 'unknown')
        .join(',')})`;
      const selector = keccakId(signature).slice(0, 10);
      const entry = {
        contract: contractName,
        index: ordinal,
        signature,
        selector,
        stateMutability: item.stateMutability ?? 'nonpayable',
        inputs: item.inputs ?? [],
        outputs: item.outputs ?? [],
      };

      if (!functionsIndex[item.name]) {
        functionsIndex[item.name] = [];
      }
      functionsIndex[item.name].push(entry);
    });
  });

  const functionsSummary = {
    generatedAt: combinedSummary.generatedAt,
    sourceDirectories: searchDirs,
    contractCount: combinedSummary.contractCount,
    uniqueFunctionNames: Object.keys(functionsIndex).length,
    functionEntries: functionTotal,
    functions: functionsIndex,
    warnings: errors,
  };

  const functionsOutputAbs = path.resolve(repoRoot, functionsOutput);
  await fs.writeFile(
    functionsOutputAbs,
    JSON.stringify(functionsSummary, null, 2),
    'utf-8'
  );

  console.log(
    `ABI bundle created at ${combinedOutputAbs} with ${Object.keys(combined).length} contracts.`
  );
  console.log(
    `Function index written to ${functionsOutputAbs} covering ${functionTotal} functions across ${Object.keys(functionsIndex).length} unique names.`
  );
  if (errors.length) {
    console.log(
      `Completed with ${errors.length} warning(s). Check the "warnings" section in the output file.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
