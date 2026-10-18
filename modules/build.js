#!/usr/bin/env node
// =========================================================================
// Text Selection Toolbar Build Script
// Usage:
//   node modules/build.js              → ESLint check + build main.user.js
//   node modules/build.js --watch      → Watch files for auto-rebuild
//   node modules/build.js --minify     → Build and minify
//   node modules/build.js --all        → Generate both main.user.js and main.min.user.js
//   node modules/build.js --no-lint    → Skip ESLint check, build directly
//   node modules/build.js --lint-only  → Run ESLint check only
// =========================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Module file list (dependency-ordered) ───────────────────────────
const modules = [
    '00-header.js',        // UserScript metadata + license
    '01-compat.js',        // GM API async compat layer
    '02-config.js',        // Config constants + state management
    '03-i18n.js',          // I18N system
    '04-compliance.js',    // Edit mode + compliance banner
    '05-menu.js',          // GM menu system
    '06-extractors.js',    // Link & password extractor
    '07-selection.js',     // Selection geometry calculator
    '08-shadow-dom.js',    // Shadow DOM container + styles
    '09-drag-preview.js',  // Drag link preview
    '10-unlock-mode.js',   // Unlock mode / super selection
    '11-clipboard.js',     // Clipboard ops + Toast
    '12-theme.js',         // Background brightness detection
    '13-renderer.js',      // Button renderer
    '14-events.js',        // Event handlers
    '15-text-correct.js',  // Smart text correction
    '16-blocker.js',       // Element blocker
    '17-festival.js',      // Fireworks particle effects
    '19-bootstrap.js',     // Bootstrap (IIFE entry)
];

// ── Configuration ──────────────────────────────────────────────────
const modulesDir = __dirname;
const outputDir = path.join(__dirname, '..');
const USERSCRIPT_NAME = 'main.user.js';
const MINIFIED_NAME = 'main.min.user.js';
const METAJS_NAME = 'main.meta.js';

// ── Parse CLI arguments ───────────────────────────────────────────
const args = process.argv.slice(2);
const doWatch = args.includes('--watch');
const doMinify = args.includes('--minify');
const doAll = args.includes('--all');
const noLint = args.includes('--no-lint');
const lintOnly = args.includes('--lint-only');

// ── ESLint check ─────────────────────────────────────────────────
function runLint() {
    const rootDir = path.join(__dirname, '..');
    const eslintBin = path.join(rootDir, 'node_modules', '.bin', 'eslint');

    console.log(`\n[${new Date().toLocaleTimeString()}] Running ESLint...`);

    try {
        const result = execSync(
            `"${eslintBin}" "modules/*.js" --max-warnings 999`,
            { cwd: rootDir, stdio: 'pipe' }
        );
        const output = result.toString().trim();
        if (output) {
            console.log(output);
        }
        console.log('  ✓  ESLint passed, no errors.\n');
        return true;
    } catch (err) {
        const stdout = err.stdout ? err.stdout.toString().trim() : '';
        const stderr = err.stderr ? err.stderr.toString().trim() : '';
        const output = stdout || stderr;

        let errorCount = 0;
        let warningCount = 0;

        if (output) {
            // Extract error and warning counts
            const errorMatch = output.match(/(\d+)\s+error/);
            const warningMatch = output.match(/(\d+)\s+warning/);
            errorCount = errorMatch ? parseInt(errorMatch[1]) : 0;
            warningCount = warningMatch ? parseInt(warningMatch[1]) : 0;

            // Print all error lines
            const lines = output.split('\n');
            let shownErrors = false;
            for (const line of lines) {
                if (/\d+:\d+\s+error\b/.test(line)) {
                    if (!shownErrors) {
                        console.error(`\n  ESLint errors (must be fixed before build):\n`);
                        shownErrors = true;
                    }
                    console.error(`  ${line}`);
                }
            }

            if (shownErrors) {
                console.error(`\n  ${errorCount} error(s) must be fixed before build.`);
            }
            if (warningCount > 0) {
                console.log(`  ${warningCount} warning(s) — review recommended but not blocking.\n`);
            }
        } else {
            console.error(`\n  ESLint check failed with exit code ${err.status}\n`);
        }

        if (errorCount > 0) {
            console.error('  Build ABORTED due to ESLint errors. Fix and try again.\n');
            return false;
        }
        return true;
    }
}

// ── Core: concatenate modules ────────────────────────────────────
function readModule(filename) {
    const filePath = path.join(modulesDir, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Module not found: ${filename}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

function concatModules() {
    let output = '';
    for (const filename of modules) {
        const content = readModule(filename);
        output += content + '\n';
    }
    return output.trim() + '\n';
}

// ── Minify: lightweight JS minifier (only removes comments and excess whitespace, preserves semantics) ──────
function minify(code) {
    // 1. Extract UserScript header (==UserScript== ... ==/UserScript==)
    const headerMatch = code.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
    const header = headerMatch ? headerMatch[0] : '';

    // 2. Extract multi-line comment blocks (/* ... */), excluding header
    let body = headerMatch ? code.slice(headerMatch.index + headerMatch[0].length) : code;

    // Note: no aggressive compression here (like variable shortening), only remove:
    //   - Single-line comments (// ...) but preserve // ==UserScript== and // @grant etc.
    //   - Excess consecutive blank lines
    //   - Leading/trailing whitespace on lines

    const lines = body.split('\n');
    const result = [];

    let prevEmpty = false;
    for (let line of lines) {
        // Skip pure comment lines (but preserve lines that look like directives)
        const trimmed = line.trim();
        if (trimmed.startsWith('//') && !trimmed.startsWith('// @') && !trimmed.startsWith('// ==')) {
            continue;
        }
        // Remove inline comments (simple approach: // not inside strings)
        // Skip this step for safety — don't process inline comments

        if (trimmed === '') {
            if (!prevEmpty) {
                result.push('');
                prevEmpty = true;
            }
        } else {
            result.push(line); // Preserve original indentation
            prevEmpty = false;
        }
    }

    body = result.join('\n').trim();
    return header + '\n' + body + '\n';
}

// ── Write file ─────────────────────────────────────────────────────
function writeOutput(filename, content) {
    const filePath = path.join(outputDir, filename);
    const oldContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    if (content === oldContent) {
        return false; // No change
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
}

// ── Print build report ───────────────────────────────────────────
function report(name, filePath, sizeBytes, changed) {
    const marker = changed ? '✓' : '○';
    console.log(`  ${marker} ${name}  →  ${path.relative(outputDir, filePath)}  (${(sizeBytes / 1024).toFixed(1)} KB)`);
}

// ── Execute build ────────────────────────────────────────────────
function build(skipLint = false) {
    const startTime = Date.now();

    // ESLint check (unless explicitly skipped)
    if (!skipLint && !noLint) {
        if (!runLint()) {
            return; // Check failed, abort build
        }
    }

    console.log(`[${new Date().toLocaleTimeString()}] Building...`);

    try {
        const raw = concatModules();

        if (doMinify || doAll) {
            // Generate minified version
            const minified = minify(raw);
            const changed = writeOutput(MINIFIED_NAME, minified);
            report('minified', path.join(outputDir, MINIFIED_NAME), minified.length, changed);

            // Generate .meta.js (metadata only, for require)
            const metaMatch = raw.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
            if (metaMatch) {
                writeOutput(METAJS_NAME, metaMatch[0] + '\n');
                report('meta', path.join(outputDir, METAJS_NAME), metaMatch[0].length, false);
            }
        }

        if (!doMinify || doAll) {
            // Generate full version
            const changed = writeOutput(USERSCRIPT_NAME, raw);
            report('full', path.join(outputDir, USERSCRIPT_NAME), raw.length, changed);
        }

        const elapsed = Date.now() - startTime;
        console.log(`  Done in ${elapsed}ms (${modules.length} modules)\n`);

    } catch (err) {
        console.error(`\n  ✗ Build failed: ${err.message}\n`);
    }
}

// ── Watch mode ────────────────────────────────────────────────────
function watch() {
    // In watch mode, run lint once first
    if (!noLint) {
        if (!runLint()) {
            console.error('Watch mode requires ESLint to pass first.\n');
            return;
        }
    }
    console.log('Watching for changes... (Ctrl+C to stop)\n');

    // Watch the modules directory
    const watchDir = modulesDir;

    // Use simple polling (cross-platform compatible, doesn't rely on fs.watch reliability)
    let lastMtimes = {};
    const initMtimes = () => {
        modules.forEach(f => {
            const fp = path.join(modulesDir, f);
            try { lastMtimes[f] = fs.statSync(fp).mtimeMs; } catch (e) {}
        });
    };
    initMtimes();

    // Initial build
    build();

    setInterval(() => {
        let changed = false;
        for (const f of modules) {
            const fp = path.join(modulesDir, f);
            try {
                const mtime = fs.statSync(fp).mtimeMs;
                if (lastMtimes[f] !== mtime) {
                    lastMtimes[f] = mtime;
                    changed = true;
                }
            } catch (e) {}
        }
        if (changed) {
            build();
        }
    }, 800);
}

// ── Entry ──────────────────────────────────────────────────────────
if (lintOnly) {
    // Run ESLint check only, no build
    const passed = runLint();
    process.exit(passed ? 0 : 1);
} else if (doWatch) {
    watch();
} else {
    build();
}
