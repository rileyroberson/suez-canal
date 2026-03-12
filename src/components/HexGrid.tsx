import React, { useMemo } from 'react';
import { useGameStore, getReachableZones } from '../store/gameStore';
import type { ZoneId, Zone, Unit, Control } from '../types/game';

// ─── Hex geometry ─────────────────────────────────────────────────────────────

const HEX_SIZE = 52; // "radius" — distance from center to vertex
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

/** Flat-top hex: pointy-top offset layout using col/row grid */
function hexCenter(col: number, row: number): { x: number; y: number } {
  const x = col * HEX_W * 0.75 + HEX_SIZE;
  const y = row * HEX_H + (col % 2 === 0 ? 0 : HEX_H / 2) + HEX_H / 2;
  return { x, y };
}

/** Generate the 6 points of a flat-top hexagon centered at (cx, cy) */
function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    pts.push(`${cx + size * Math.cos(angleRad)},${cy + size * Math.sin(angleRad)}`);
  }
  return pts.join(' ');
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function controlFill(control: Control, category: string): string {
  if (category === 'sea') return '#1e3a5f';
  if (category === 'support') return '#2d3a1e';
  if (control === 'opener') return '#1a3a5c';
  if (control === 'blocker') return '#3a1a1a';
  return '#2a2a2a';
}

function controlStroke(control: Control): string {
  if (control === 'opener') return '#3b82f6';
  if (control === 'blocker') return '#ef4444';
  return '#4b5563';
}

function opennessColor(openness: number): string {
  if (openness >= 80) return '#22c55e';
  if (openness >= 50) return '#eab308';
  if (openness >= 20) return '#f97316';
  return '#ef4444';
}

function unitColor(faction: string): string {
  return faction === 'opener' ? '#60a5fa' : '#f87171';
}

// ─── SVG canvas size ──────────────────────────────────────────────────────────

// Grid layout: cols 1-3, rows 0-6
const COLS = 5; // 0..4 but we use 1..3
const ROWS = 8;
const SVG_W = COLS * HEX_W * 0.75 + HEX_SIZE * 1.5;
const SVG_H = ROWS * HEX_H + HEX_H;

// ─── Zone label abbreviations ────────────────────────────────────────────────

const SHORT_LABELS: Record<ZoneId, string[]> = {
  mediterranean: ['Mediterranean', 'Sea'],
  'port-said': ['Port Said'],
  ismailia: ['Ismailia'],
  'great-bitter-lake': ['Great Bitter', 'Lake'],
  'little-bitter': ['Little Bitter'],
  'suez-city': ['Suez City'],
  'red-sea': ['Red Sea'],
  sinai: ['Sinai'],
  'nile-delta': ['Nile Delta'],
  'arabian-peninsula': ['Arabian', 'Peninsula'],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HexGrid(): React.ReactElement {
  const zones = useGameStore((s) => s.zones);
  const units = useGameStore((s) => s.units);
  const phase = useGameStore((s) => s.phase);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const selectedUnitId = useGameStore((s) => s.selectedUnitId);
  const buildTargetZoneId = useGameStore((s) => s.buildTargetZoneId);
  const winResult = useGameStore((s) => s.winResult);

  const selectUnit = useGameStore((s) => s.selectUnit);
  const moveUnit = useGameStore((s) => s.moveUnit);
  const setBuildTargetZone = useGameStore((s) => s.setBuildTargetZone);

  const gameState = useGameStore((s) => s);

  // Compute reachable zones for selected unit
  const reachableZones = useMemo<ZoneId[]>(() => {
    if (phase !== 'move' || !selectedUnitId) return [];
    const unit = units.find((u) => u.id === selectedUnitId);
    if (!unit || unit.moved) return [];
    return getReachableZones(unit, gameState);
  }, [phase, selectedUnitId, units, gameState]);

  function handleZoneClick(zoneId: ZoneId) {
    if (winResult) return;

    if (phase === 'move') {
      if (selectedUnitId) {
        // Try to move
        if (reachableZones.includes(zoneId)) {
          moveUnit(selectedUnitId, zoneId);
        } else {
          // Deselect
          selectUnit(null);
        }
      }
    } else if (phase === 'build') {
      setBuildTargetZone(buildTargetZoneId === zoneId ? null : zoneId);
    }
  }

  function handleUnitClick(e: React.MouseEvent, unit: Unit) {
    e.stopPropagation();
    if (winResult) return;
    if (phase !== 'move') return;
    if (unit.faction !== currentTurn) return;
    if (unit.moved) return;
    selectUnit(selectedUnitId === unit.id ? null : unit.id);
  }

  const zoneList = Object.values(zones) as Zone[];

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-950 overflow-auto p-2">
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="max-w-full"
        style={{ minWidth: 320 }}
      >
        {/* Connection lines between adjacent canal zones */}
        <CanalConnectors zones={zones} />

        {/* Hexagons */}
        {zoneList.map((zone) => {
          const { x, y } = hexCenter(zone.gridCol, zone.gridRow);
          const isSelected = buildTargetZoneId === zone.id;
          const isReachable = reachableZones.includes(zone.id);
          const isContested =
            units.some((u) => u.zoneId === zone.id && u.faction === 'opener') &&
            units.some((u) => u.zoneId === zone.id && u.faction === 'blocker');

          const fill = controlFill(zone.control, zone.category);
          const stroke = isSelected
            ? '#facc15'
            : isReachable
            ? '#a3e635'
            : isContested
            ? '#fb923c'
            : controlStroke(zone.control);
          const strokeWidth = isSelected || isReachable || isContested ? 2.5 : 1.5;

          const hexPts = hexPoints(x, y, HEX_SIZE - 2);
          const unitsHere = units.filter((u) => u.zoneId === zone.id);

          return (
            <g
              key={zone.id}
              onClick={() => handleZoneClick(zone.id)}
              className="cursor-pointer"
              style={{ cursor: winResult ? 'default' : 'pointer' }}
            >
              {/* Hex fill */}
              <polygon
                points={hexPts}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={0.95}
              />

              {/* Reachable highlight overlay */}
              {isReachable && (
                <polygon
                  points={hexPts}
                  fill="#a3e635"
                  opacity={0.12}
                />
              )}

              {/* Zone name */}
              {SHORT_LABELS[zone.id].map((line, i) => (
                <text
                  key={i}
                  x={x}
                  y={
                    y -
                    (zone.category === 'canal' ? 10 : 6) +
                    i * 13 -
                    (SHORT_LABELS[zone.id].length - 1) * 6
                  }
                  textAnchor="middle"
                  fontSize={9}
                  fill="#d1d5db"
                  fontWeight="500"
                >
                  {line}
                </text>
              ))}

              {/* Openness for canal zones */}
              {zone.category === 'canal' && zone.openness !== null && (
                <>
                  <text
                    x={x}
                    y={y + 8}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight="bold"
                    fill={opennessColor(zone.openness)}
                  >
                    {zone.openness}%
                  </text>
                  {/* Obstruction tokens */}
                  {zone.obstructionTokens > 0 && (
                    <text
                      x={x}
                      y={y + 22}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#fb923c"
                    >
                      ⛔ ×{zone.obstructionTokens}
                    </text>
                  )}
                  {/* Fortification */}
                  {zone.fortificationLevel > 0 && (
                    <text
                      x={x}
                      y={y + (zone.obstructionTokens > 0 ? 33 : 22)}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#fbbf24"
                    >
                      {'🔒'.repeat(zone.fortificationLevel)}
                    </text>
                  )}
                </>
              )}

              {/* Support zone fortification */}
              {zone.category === 'support' && zone.fortificationLevel > 0 && (
                <text
                  x={x}
                  y={y + 18}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#fbbf24"
                >
                  {'🔒'.repeat(zone.fortificationLevel)}
                </text>
              )}

              {/* Units */}
              <UnitDots
                units={unitsHere}
                cx={x}
                cy={y + 34}
                onUnitClick={handleUnitClick}
                selectedUnitId={selectedUnitId}
              />
            </g>
          );
        })}

        {/* Legend */}
        <Legend />
      </svg>
    </div>
  );
}

// ─── Canal zone connector lines ───────────────────────────────────────────────

function CanalConnectors({ zones }: { zones: Record<ZoneId, Zone> }): React.ReactElement {
  const canalOrder: ZoneId[] = [
    'port-said',
    'ismailia',
    'great-bitter-lake',
    'little-bitter',
    'suez-city',
  ];
  const med = zones['mediterranean'];
  const portSaid = zones['port-said'];
  const suezCity = zones['suez-city'];
  const redSea = zones['red-sea'];

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  // Med → Port Said
  if (med && portSaid) {
    const a = hexCenter(med.gridCol, med.gridRow);
    const b = hexCenter(portSaid.gridCol, portSaid.gridRow);
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  // Canal chain
  for (let i = 0; i < canalOrder.length - 1; i++) {
    const a = zones[canalOrder[i]];
    const b = zones[canalOrder[i + 1]];
    if (a && b) {
      const ca = hexCenter(a.gridCol, a.gridRow);
      const cb = hexCenter(b.gridCol, b.gridRow);
      lines.push({ x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y });
    }
  }
  // Suez City → Red Sea
  if (suezCity && redSea) {
    const a = hexCenter(suezCity.gridCol, suezCity.gridRow);
    const b = hexCenter(redSea.gridCol, redSea.gridRow);
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  return (
    <g>
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#6b7280"
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.5}
        />
      ))}
    </g>
  );
}

// ─── Unit dots ────────────────────────────────────────────────────────────────

interface UnitDotsProps {
  units: Unit[];
  cx: number;
  cy: number;
  onUnitClick: (e: React.MouseEvent, unit: Unit) => void;
  selectedUnitId: string | null;
}

function UnitDots({
  units,
  cx,
  cy,
  onUnitClick,
  selectedUnitId,
}: UnitDotsProps): React.ReactElement {
  const DOT_R = 6;
  const SPACING = 15;
  const total = units.length;
  const startX = cx - ((total - 1) * SPACING) / 2;

  return (
    <g>
      {units.map((unit, i) => {
        const ux = startX + i * SPACING;
        const isSelected = unit.id === selectedUnitId;
        const color = unitColor(unit.faction);
        const opacity = unit.moved ? 0.45 : 1;

        return (
          <g
            key={unit.id}
            onClick={(e) => onUnitClick(e, unit)}
            style={{ cursor: 'pointer' }}
            opacity={opacity}
          >
            {/* Selection ring */}
            {isSelected && (
              <circle cx={ux} cy={cy} r={DOT_R + 3} fill="none" stroke="#facc15" strokeWidth={2} />
            )}
            <circle cx={ux} cy={cy} r={DOT_R} fill={color} stroke="#111" strokeWidth={1} />
            {/* HP pip */}
            <text
              x={ux}
              y={cy + 3.5}
              textAnchor="middle"
              fontSize={7}
              fill="#111"
              fontWeight="bold"
            >
              {unit.hp}
            </text>
            {/* Unit type abbreviation below dot */}
            <text
              x={ux}
              y={cy + DOT_R + 9}
              textAnchor="middle"
              fontSize={6.5}
              fill={color}
            >
              {unitAbbr(unit.type)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function unitAbbr(type: string): string {
  const map: Record<string, string> = {
    'patrol-boat': 'PB',
    destroyer: 'DD',
    frigate: 'FF',
    carrier: 'CV',
    'cargo-escort': 'CE',
    'mine-layer': 'ML',
  };
  return map[type] ?? '??';
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend(): React.ReactElement {
  const lx = 4;
  const ly = SVG_H - 64;
  return (
    <g>
      <rect x={lx} y={ly} width={110} height={60} fill="#111827" rx={4} opacity={0.85} />
      <text x={lx + 6} y={ly + 12} fontSize={8} fill="#9ca3af" fontWeight="bold">
        LEGEND
      </text>
      <circle cx={lx + 12} cy={ly + 24} r={4} fill="#60a5fa" />
      <text x={lx + 20} y={ly + 27} fontSize={7.5} fill="#d1d5db">
        Opener unit (HP inside)
      </text>
      <circle cx={lx + 12} cy={ly + 36} r={4} fill="#f87171" />
      <text x={lx + 20} y={ly + 39} fontSize={7.5} fill="#d1d5db">
        Blocker unit
      </text>
      <rect x={lx + 8} y={ly + 46} width={8} height={6} fill="none" stroke="#a3e635" strokeWidth={1.5} />
      <text x={lx + 20} y={ly + 52} fontSize={7.5} fill="#d1d5db">
        Reachable zone
      </text>
    </g>
  );
}
