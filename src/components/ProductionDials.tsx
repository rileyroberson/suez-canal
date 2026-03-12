import React from 'react';
import { useGameStore } from '../store/gameStore';

interface DialBarProps {
  label: string;
  value: number;
  rate: number;
  max: number;
  color: string;
}

function DialBar({ label, value, rate, max, color }: DialBarProps): React.ReactElement {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-14 text-right font-semibold ${color}`}>{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-3 relative overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: 'currentColor' }}
        />
        <div
          className={`absolute inset-0 rounded-full transition-all duration-300 ${color.replace('text-', 'bg-').replace('-400', '-600').replace('-300', '-700')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-gray-300">
        {value} <span className="text-gray-500">+{rate}/t</span>
      </span>
    </div>
  );
}

export default function ProductionDials(): React.ReactElement {
  const opener = useGameStore((s) => s.opener);
  const blocker = useGameStore((s) => s.blocker);
  const zones = useGameStore((s) => s.zones);

  // Canal openness summary
  const canalZones = Object.values(zones).filter((z) => z.category === 'canal');
  const avgOpenness =
    canalZones.length > 0
      ? Math.round(canalZones.reduce((s, z) => s + (z.openness ?? 0), 0) / canalZones.length)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-2 p-3 bg-gray-900 border-t border-gray-700">
      {/* Opener dials */}
      <div className="bg-gray-800 rounded p-2">
        <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          Opener — Production
        </div>
        <div className="flex flex-col gap-1.5">
          <DialBar label="Steel" value={opener.resources.steel} rate={opener.productionRates.steel} max={30} color="text-gray-300" />
          <DialBar label="Fuel" value={opener.resources.fuel} rate={opener.productionRates.fuel} max={20} color="text-orange-300" />
          <DialBar label="Intel" value={opener.resources.intel} rate={opener.productionRates.intel} max={20} color="text-cyan-300" />
          <DialBar label="Morale" value={opener.resources.morale} rate={opener.productionRates.morale} max={100} color="text-pink-300" />
        </div>
      </div>

      {/* Blocker dials */}
      <div className="bg-gray-800 rounded p-2">
        <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
          Blocker — Production
        </div>
        <div className="flex flex-col gap-1.5">
          <DialBar label="Steel" value={blocker.resources.steel} rate={blocker.productionRates.steel} max={30} color="text-gray-300" />
          <DialBar label="Fuel" value={blocker.resources.fuel} rate={blocker.productionRates.fuel} max={20} color="text-orange-300" />
          <DialBar label="Intel" value={blocker.resources.intel} rate={blocker.productionRates.intel} max={20} color="text-cyan-300" />
          <DialBar label="Morale" value={blocker.resources.morale} rate={blocker.productionRates.morale} max={100} color="text-pink-300" />
        </div>
      </div>

      {/* Canal openness bar */}
      <div className="col-span-2 bg-gray-800 rounded p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            Canal Openness (avg)
          </span>
          <span
            className={`text-sm font-bold ${
              avgOpenness >= 70
                ? 'text-green-400'
                : avgOpenness >= 40
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {avgOpenness}%
          </span>
        </div>
        <div className="bg-gray-700 rounded-full h-4 relative overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              avgOpenness >= 70
                ? 'bg-green-600'
                : avgOpenness >= 40
                ? 'bg-yellow-600'
                : 'bg-red-700'
            }`}
            style={{ width: `${avgOpenness}%` }}
          />
          {/* Threshold markers */}
          <div className="absolute inset-y-0 left-[10%] w-px bg-red-400 opacity-60" title="Blocker win threshold" />
          <div className="absolute inset-y-0 left-[90%] w-px bg-blue-400 opacity-60" title="Opener win threshold" />
        </div>
        <div className="flex justify-between text-gray-600 text-xs mt-0.5 px-0.5">
          <span>← Blocker win ≤10%</span>
          {canalZones.map((z) => (
            <span key={z.id} className="text-gray-500" title={z.name}>
              {z.name.split(' ')[0]}: {z.openness}%
            </span>
          ))}
          <span>≥90% Opener win →</span>
        </div>
      </div>
    </div>
  );
}
