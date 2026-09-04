import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../lib/api.js';
import { planUpdated } from '../features/auth/authSlice.js';

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function featuresFor(plan) {
  return [
    `${plan.maxResolution} streaming quality`,
    `Watch on ${plan.maxStreams} device${plan.maxStreams > 1 ? 's' : ''} at once`,
    'Full movie & TV library',
    plan.id === 'free' ? 'Ad-supported playback' : 'Ad-free',
    plan.id === 'premium' ? 'Early access to new releases' : 'Cancel anytime',
  ];
}

export default function Subscriptions() {
  const [plans, setPlans] = useState([]);
  const currentPlan = useSelector((s) => s.auth.user?.plan);
  const dispatch = useDispatch();

  useEffect(() => {
    api.get('/subscriptions/plans').then((r) => setPlans(r.data));
  }, []);

  async function choose(planId) {
    const { data } = await api.post('/subscriptions', { planId });
    dispatch(planUpdated(data.plan));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="font-display text-center text-4xl tracking-wide text-white sm:text-5xl">CineBharat Membership</h1>
      <p className="mt-3 text-center text-white/60">Choose the plan that fits your streaming needs.</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const featured = plan.id === 'premium';
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                featured ? 'border-accent/60 bg-accent/[0.07]' : 'border-white/10 bg-[#161a24]/90'
              }`}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white">
                {plan.name.charAt(0)}
              </div>
              <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold text-white">
                ${(plan.priceCents / 100).toFixed(2)}
                <span className="text-sm font-normal text-white/50"> / month</span>
              </p>

              <button
                onClick={() => choose(plan.id)}
                disabled={isCurrent}
                className={`mt-5 w-full rounded-full py-2.5 text-sm font-semibold transition-colors ${
                  featured
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'border border-white/25 text-white hover:bg-white/5'
                } disabled:cursor-default disabled:opacity-40`}
              >
                {isCurrent ? 'Current plan' : 'Select this plan'}
              </button>

              <ul className="mt-6 space-y-2.5 text-sm text-white/70">
                {featuresFor(plan).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-sm text-white/40">
        Demo checkout — no payment gateway is wired up. Selecting a plan just updates your account tier.
      </p>
    </div>
  );
}
