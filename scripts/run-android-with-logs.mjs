#!/usr/bin/env node
/**
 * 真机测试：Debug 构建 + 自动采集 adb logcat 到 logs/ 目录
 * 崩溃或异常时可直接查看 logs/logcat-<timestamp>.log 排查。
 *
 * 用法：npm run android:device  或  node scripts/run-android-with-logs.mjs
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT, 'logs');
const PACKAGE_ID = 'com.hearclear.app';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: opts.stdio ?? 'inherit', shell: opts.shell ?? false, ...opts });
    p.on('error', reject);
    p.on('exit', (code, sig) => {
      if (sig) reject(new Error(`Exited with signal ${sig}`));
      else resolve(code);
    });
  });
}

function runBackground(cmd, args, outStream) {
  const p = spawn(cmd, args, { stdio: ['ignore', outStream, outStream], shell: false });
  return p;
}

async function main() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logFile = path.join(LOGS_DIR, `logcat-${timestamp}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  console.log('[android:device] 设置 adb reverse tcp:8081 tcp:8081');
  await run('adb', ['reverse', 'tcp:8081', 'tcp:8081']).catch(() => {});

  console.log('[android:device] 清空 logcat 并开始采集 ->', logFile);
  await run('adb', ['logcat', '-c']).catch(() => {});
  const logcat = runBackground('adb', ['logcat', '-v', 'time', '*:V'], logStream);
  logcat.unref();

  const cleanup = (codeOrSig) => {
    try {
      logcat.kill('SIGTERM');
    } catch (_) {}
    logStream.end();
    console.log('\n[android:device] 日志已保存:', logFile);
    process.exit(typeof codeOrSig === 'number' ? codeOrSig : 0);
  };

  process.on('SIGINT', () => cleanup(0));
  process.on('SIGTERM', () => cleanup(0));

  console.log('[android:device] 启动 Debug 构建并安装到真机...');
  const code = await run('npx', ['expo', 'run:android'], { stdio: 'inherit' }).catch((e) => {
    console.error(e.message || e);
    return 1;
  });
  cleanup(code);
}

main();
