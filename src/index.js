import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { program } from 'commander';
import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATES = {
  'todo-saas': {
    label: 'Todo SaaS',
    description: 'Full todo app with auth, categories, due dates',
    stack: 'Express + SQLite + JWT',
  },
  'url-shortener': {
    label: 'URL Shortener',
    description: 'Link shortener with click analytics dashboard',
    stack: 'Express + Redis',
  },
  'pastebin': {
    label: 'Pastebin',
    description: 'Code sharing with syntax highlighting and expiry',
    stack: 'Express + SQLite',
  },
  'status-page': {
    label: 'Status Page',
    description: 'Service monitoring with incident history and alerts',
    stack: 'Express + health checks',
  },
  'invoice-generator': {
    label: 'Invoice Generator',
    description: 'PDF invoices with Stripe-ready checkout',
    stack: 'Express + PDF + Stripe',
  },
};

function header() {
  console.log('');
  console.log(chalk.yellow('  ⚡ one-prompt-saas'));
  console.log(chalk.gray('  One prompt. One command. Full deployed SaaS.'));
  console.log('');
}

function printNext(targetDir, templateKey, auto) {
  const t = TEMPLATES[templateKey];
  console.log('');
  console.log(chalk.green('  Done.'));
  console.log('');
  console.log(chalk.white(`  Project: ${chalk.yellow(targetDir)}`));
  console.log(chalk.white(`  Template: ${chalk.yellow(t.label)} — ${t.stack}`));
  console.log('');

  if (!auto) {
    console.log(chalk.gray('  Next steps:'));
    console.log('');
    console.log(chalk.white('  1. Open Claude Code in your new project:'));
    console.log(chalk.cyan(`     cd ${targetDir} && claude`));
    console.log('');
    console.log(chalk.white('  2. Claude will read CLAUDE.md and build everything.'));
    console.log(chalk.white('     No further input needed. Watch it ship.'));
    console.log('');
    console.log(chalk.gray('  Tip: run with --auto to skip this step entirely.'));
    console.log('');
  }
}

export async function run() {
  program
    .name('one-prompt-saas')
    .description('One prompt. One command. Full deployed SaaS.')
    .option('--auto', 'Run Claude Code automatically after scaffolding')
    .option('--template <name>', 'Skip template selection')
    .option('--name <name>', 'Skip project name prompt')
    .parse(process.argv);

  const opts = program.opts();

  header();

  const templateKey = (opts.template && TEMPLATES[opts.template])
    ? opts.template
    : await select({
        message: 'Pick a template:',
        choices: Object.entries(TEMPLATES).map(([value, t]) => ({
          value,
          name: `${chalk.white(t.label)} ${chalk.gray('—')} ${chalk.gray(t.description)}`,
          description: chalk.gray(t.stack),
        })),
      });

  const projectName = opts.name
    ? opts.name
    : await input({
        message: 'Project name:',
        default: templateKey,
        validate: (v) => /^[a-z0-9-_]+$/.test(v) || 'Lowercase letters, numbers, hyphens only',
      });

  const targetDir = join(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.log(chalk.red(`  Directory already exists: ${targetDir}`));
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });

  const promptPath = join(__dirname, '..', 'prompts', `${templateKey}.md`);
  const promptContent = readFileSync(promptPath, 'utf8');

  const claudeMd = [
    '# CLAUDE.md',
    '',
    '> This file is your specification. Read it fully, then build everything described below.',
    '> No placeholders. No TODOs. Every file complete and working.',
    '',
    '---',
    '',
    promptContent,
  ].join('\n');

  writeFileSync(join(targetDir, 'CLAUDE.md'), claudeMd);

  printNext(targetDir, templateKey, opts.auto);

  if (opts.auto) {
    console.log(chalk.yellow('  --auto: launching Claude Code...\n'));
    try {
      execFileSync(
        'claude',
        ['--dangerously-skip-permissions'],
        { stdio: 'inherit', cwd: targetDir },
      );
    } catch {
      console.log(chalk.red('  Claude Code exited. Check the project directory.'));
    }
  }
}
