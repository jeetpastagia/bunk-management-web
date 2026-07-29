import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Input, Spinner, Badge } from '../components/ui';

export default function Tools() {
  const [calc, setCalc] = useState(null);
  const [simDate, setSimDate] = useState('');
  const [sim, setSim] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.calculator().then(setCalc).catch((e) => setError(e.message));
  }, []);

  const runSimulation = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    setSim(null);
    try {
      const res = await api.simulate(simDate);
      setSim(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Smart tools</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Calculator, bunk predictor, and future lecture simulator.</p>
      </div>

      {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

      {!calc ? (
        <div className="flex justify-center py-10"><Spinner size={28} /></div>
      ) : (
        <>
          <Card>
            <h2 className="font-display font-semibold mb-4">Next lecture calculator</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/20 p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">If I bunk the next lecture</p>
                <p className="mono-num text-2xl font-bold text-[var(--color-danger)]">{calc.nextLectureProjection.ifBunked}%</p>
              </div>
              <div className="rounded-xl bg-[var(--color-safe)]/8 border border-[var(--color-safe)]/20 p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">If I attend the next lecture</p>
                <p className="mono-num text-2xl font-bold text-[var(--color-safe)]">{calc.nextLectureProjection.ifAttended}%</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display font-semibold mb-1">Safe bunk predictor</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Currently at <span className="mono-num">{calc.current.percentage}%</span> ({calc.current.attended}/{calc.current.conducted})
            </p>
            <p className="text-lg">
              You can safely bunk <span className="mono-num font-bold text-[var(--color-brand-soft)]">{Number.isFinite(calc.safeBunksRemaining) ? calc.safeBunksRemaining : '∞'}</span> more lecture{calc.safeBunksRemaining === 1 ? '' : 's'}.
            </p>
          </Card>

          <Card>
            <h2 className="font-display font-semibold mb-4">Lectures needed for each target</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(calc.lecturesNeededForTargets).map(([target, needed]) => (
                <div key={target} className="rounded-xl bg-white/5 p-4 text-center">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">{target}%</p>
                  <p className="mono-num text-2xl font-bold">{Number.isFinite(needed) ? needed : '—'}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card>
        <h2 className="font-display font-semibold mb-1">Future lecture simulator</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">Pick a future date to see the extremes: bunk everything vs. attend everything that day.</p>
        <form onSubmit={runSimulation} className="flex items-end gap-3 flex-wrap">
          <Input label="Date" type="date" value={simDate} onChange={(e) => setSimDate(e.target.value)} required />
          <Button type="submit" disabled={simLoading}>{simLoading ? 'Simulating…' : 'Simulate'}</Button>
        </form>

        {sim && (
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <ScenarioCard title="If I bunk every lecture" scenario={sim.bunkAllScenario} />
            <ScenarioCard title="If I attend every lecture" scenario={sim.attendAllScenario} />
            {sim.isHoliday && <p className="text-xs text-[var(--color-text-faint)] sm:col-span-2">That date is marked as a holiday — no lectures are scheduled.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

const STATUS_TONE = { safe: 'safe', risky: 'risky', danger: 'danger' };

function ScenarioCard({ title, scenario }) {
  return (
    <div className="rounded-xl bg-white/5 border border-[var(--color-border)] p-4">
      <p className="text-xs text-[var(--color-text-muted)] mb-2">{title}</p>
      <div className="flex items-center justify-between">
        <span className="mono-num text-2xl font-bold">{scenario.resultingPercentage}%</span>
        <Badge tone={STATUS_TONE[scenario.status]}>{scenario.status}</Badge>
      </div>
    </div>
  );
}
