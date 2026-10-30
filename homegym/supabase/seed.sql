-- Generato da tools/gen-seed.js a partire da js/data.js. Esegui dopo schema.sql.
insert into public.exercises (id, name, muscle_group, kind, main_muscles, also_muscles) values
  ('panca', 'Panca piana con bilanciere', 'Petto', 'load', array['pettorali']::text[], array['tricipiti']::text[]),
  ('rematore', 'Rematore con bilanciere', 'Schiena', 'load', array['dorsali']::text[], array['bicipiti']::text[]),
  ('stacco', 'Stacco rumeno', 'Femorali e glutei', 'load', array['gambe']::text[], array[]::text[]),
  ('spanish', 'Spanish squat con elastico', 'Quadricipiti e tendine', 'time', array['gambe']::text[], array[]::text[]),
  ('facepull', 'Face pull ai cavi alti', 'Spalle posteriori', 'load', array['spalle']::text[], array['dorsali']::text[]),
  ('plank', 'Plank', 'Core', 'time', array['core']::text[], array[]::text[]),
  ('lat', 'Lat machine ai cavi alti', 'Dorsali', 'load', array['dorsali']::text[], array['bicipiti']::text[]),
  ('military', 'Military press in piedi', 'Spalle', 'load', array['spalle']::text[], array['tricipiti']::text[]),
  ('hipthrust', 'Hip thrust con bilanciere', 'Glutei', 'load', array['gambe']::text[], array[]::text[]),
  ('pulley', 'Pulley ai cavi bassi', 'Schiena', 'load', array['dorsali']::text[], array['bicipiti']::text[]),
  ('curl', 'Curl con manubri', 'Bicipiti', 'load', array['bicipiti']::text[], array[]::text[]),
  ('pushdown', 'Push-down con corda', 'Tricipiti', 'load', array['tricipiti']::text[], array[]::text[]),
  ('deadbug', 'Dead bug', 'Core', 'bw', array['core']::text[], array[]::text[]),
  ('negative', 'Trazioni negative (opzionale)', 'Dorsali', 'bw', array['dorsali']::text[], array['bicipiti']::text[]),
  ('squat', 'Squat al rack con pausa', 'Gambe', 'load', array['gambe']::text[], array[]::text[]),
  ('inclinata', 'Panca inclinata con manubri', 'Petto alto', 'load', array['pettorali']::text[], array['tricipiti']::text[]),
  ('rem1', 'Rematore a un braccio', 'Schiena', 'load', array['dorsali']::text[], array['bicipiti']::text[]),
  ('iperestensioni', 'Iperestensioni su fitball', 'Lombari e glutei', 'bw', array['dorsali']::text[], array['gambe']::text[]),
  ('laterali', 'Alzate laterali', 'Spalle', 'load', array['spalle']::text[], array[]::text[]),
  ('reverse', 'Reverse fly con manubri', 'Spalle posteriori', 'load', array['spalle']::text[], array['dorsali']::text[]),
  ('dip', 'Dip ai supporti', 'Petto e tricipiti', 'bw', array['pettorali', 'tricipiti']::text[], array[]::text[])
on conflict (id) do update set name = excluded.name, muscle_group = excluded.muscle_group, kind = excluded.kind, main_muscles = excluded.main_muscles, also_muscles = excluded.also_muscles;

insert into public.plan_days (key, title, focus, weekday, sort) values
  ('a', 'Seduta A', 'Spinta, tirata e catena posteriore', 'Martedì', 1),
  ('b', 'Seduta B', 'Tirate verticali, glutei e core', 'Giovedì', 2),
  ('c', 'Seduta C', 'Gambe prudenti, spalle e schiena', 'Sabato', 3)
on conflict (key) do update set title = excluded.title, focus = excluded.focus, weekday = excluded.weekday, sort = excluded.sort;

delete from public.plan_exercises;
insert into public.plan_exercises (day_key, exercise_id, position, sets, reps, rest_seconds) values
  ('a', 'panca', 1, 3, '6-10', 90),
  ('a', 'rematore', 2, 4, '8-10', 90),
  ('a', 'stacco', 3, 3, '8-10', 120),
  ('a', 'spanish', 4, 4, '30-45 s', 60),
  ('a', 'facepull', 5, 3, '15', 60),
  ('a', 'plank', 6, 3, '30-45 s', 60),
  ('b', 'lat', 1, 4, '8-12', 90),
  ('b', 'military', 2, 3, '6-10', 120),
  ('b', 'hipthrust', 3, 4, '8-12', 90),
  ('b', 'pulley', 4, 3, '10-12', 90),
  ('b', 'curl', 5, 2, '10-12', 60),
  ('b', 'pushdown', 6, 2, '10-12', 60),
  ('b', 'deadbug', 7, 3, '8', 60),
  ('b', 'negative', 8, 3, '3-5', 90),
  ('c', 'squat', 1, 3, '6-8', 120),
  ('c', 'inclinata', 2, 3, '8-12', 90),
  ('c', 'rem1', 3, 3, '10-12', 60),
  ('c', 'iperestensioni', 4, 3, '12-15', 60),
  ('c', 'laterali', 5, 3, '12-15', 60),
  ('c', 'reverse', 6, 3, '12-15', 60),
  ('c', 'dip', 7, 2, '8-12', 90);
