type Props = {
  label: string;
  value: number | string;
  detail: string;
  tone?: 'ink' | 'rose' | 'green' | 'amber';
};

export default function MetricCard({ label, value, detail, tone = 'ink' }: Props) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
