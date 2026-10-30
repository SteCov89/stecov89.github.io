// Rigenera supabase/seed.sql a partire da js/data.js.  Uso:  node tools/gen-seed.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), ctx);
const SG = ctx.SG, q = s => "'" + String(s).replace(/'/g, "''") + "'";
let o = '-- Generato da tools/gen-seed.js a partire da js/data.js. Esegui dopo schema.sql.\n';
const arr = a => "array[" + (a || []).map(q).join(', ') + "]::text[]";
o += 'insert into public.exercises (id, name, muscle_group, kind, main_muscles, also_muscles) values\n' + Object.keys(SG.EXERCISES).map(id => { const e = SG.EXERCISES[id], m = e.muscles || {}; return `  (${q(id)}, ${q(e.name)}, ${q(e.group)}, ${q(e.kind)}, ${arr(m.main)}, ${arr(m.also)})`; }).join(',\n') + '\non conflict (id) do update set name = excluded.name, muscle_group = excluded.muscle_group, kind = excluded.kind, main_muscles = excluded.main_muscles, also_muscles = excluded.also_muscles;\n\n';
o += 'insert into public.plan_days (key, title, focus, weekday, sort) values\n' + SG.PLAN.map((d, i) => `  (${q(d.key)}, ${q(d.title)}, ${q(d.focus)}, ${q(d.weekday)}, ${i + 1})`).join(',\n') + '\non conflict (key) do update set title = excluded.title, focus = excluded.focus, weekday = excluded.weekday, sort = excluded.sort;\n\n';
const rows = []; SG.PLAN.forEach(d => d.items.forEach((it, i) => rows.push(`  (${q(d.key)}, ${q(it.ex)}, ${i + 1}, ${it.sets}, ${q(it.reps)}, ${it.rest})`)));
o += 'delete from public.plan_exercises;\ninsert into public.plan_exercises (day_key, exercise_id, position, sets, reps, rest_seconds) values\n' + rows.join(',\n') + ';\n';
fs.writeFileSync(path.join(root, 'supabase/seed.sql'), o);
console.log('seed.sql scritto:', Object.keys(SG.EXERCISES).length, 'esercizi,', rows.length, 'righe di piano');
