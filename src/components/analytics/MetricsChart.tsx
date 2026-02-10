"use client";

interface MetricsChartProps {
  entries: {
    label: string;
    values: { name: string; value: number; color: string }[];
  }[];
  height?: number;
}

/**
 * Graphique en barres CSS responsive pour afficher l'évolution de métriques.
 * Pattern identique au graphique de coûts dans settings/costs/page.tsx.
 */
export default function MetricsChart({ entries, height = 160 }: MetricsChartProps) {
  if (entries.length === 0) return null;

  // Trouver la valeur max pour le scaling
  const allValues = entries.flatMap((e) => e.values.map((v) => v.value));
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height }}>
        {entries.map((entry, i) => (
          <div key={i} className="flex-1 flex items-end gap-0.5" title={entry.label}>
            {entry.values.map((v, j) => (
              <div
                key={j}
                className="flex-1 rounded-t transition-all"
                style={{
                  height: `${Math.max((v.value / maxVal) * 100, 2)}%`,
                  backgroundColor: v.color,
                  minHeight: 2,
                }}
                title={`${v.name}: ${v.value.toLocaleString("fr-FR")}`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Labels */}
      <div className="flex gap-1">
        {entries.map((entry, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] text-muted-foreground truncate block">
              {entry.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
