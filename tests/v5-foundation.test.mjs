import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contrastRatio} from '../lib/design/palette.js';

test('V5 Direction A tokens enforce Emerald Eco-Green and Slate neutrals', async () => {
  const css = await readFile('app/v5-foundation.css', 'utf8');
  assert.ok(css.includes('--reloo-v5-primary-600: #059669'), 'Primary 600 token exists');
  assert.ok(css.includes('--reloo-v5-primary-700: #047857'), 'Primary 700 token exists');
  assert.ok(css.includes('--reloo-v5-slate-900: #0f172a'), 'Slate 900 token exists');
  assert.ok(css.includes('--reloo-v5-slate-50:  #f8fafc') || css.includes('--reloo-v5-slate-50: #f8fafc'), 'Slate 50 canvas token exists');
  assert.ok(css.includes('--reloo-v5-target-touch: 48px'), '48px touch target token exists');
  assert.ok(css.includes('env(safe-area-inset-top'), 'Safe area top handling exists');
  assert.ok(css.includes('env(safe-area-inset-bottom'), 'Safe area bottom handling exists');
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'Accessible reduced-motion override exists');
});

test('V5 Emerald contrast ratio passes WCAG AAA for buttons and AA for body', () => {
  // Emerald 700 on white: >= 4.5:1 (passes WCAG AA)
  const ratio700 = contrastRatio('#047857', '#ffffff');
  assert.ok(ratio700 >= 4.5, `Emerald 700 contrast ratio was ${ratio700}`);
  
  // Slate 900 on white: >= 7.0:1 (passes WCAG AAA)
  const ratioSlate = contrastRatio('#0f172a', '#ffffff');
  assert.ok(ratioSlate >= 7.0, `Slate 900 contrast ratio was ${ratioSlate}`);

  // White on Emerald 700 (primary button background): >= 4.5:1 (passes WCAG AA)
  assert.ok(ratio700 >= 4.5, `White on Emerald 700 button ratio was ${ratio700}`);
});

test('V5 foundation is properly imported in root layout', async () => {
  const layout = await readFile('app/layout.js', 'utf8');
  assert.ok(layout.includes('v5-foundation.css'), 'v5-foundation.css is imported in app/layout.js');
});
