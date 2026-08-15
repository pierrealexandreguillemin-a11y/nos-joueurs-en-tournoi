// Calibration fixture — a component styled only through semantic tokens.
// Proves the frozen-palette check does not fire on conforming markup.
export function Conforming() {
  return (
    <div className="bg-card text-card-foreground border-border">
      <span className="bg-success text-success-foreground">ok</span>
      <span className="text-warning-strong">attention</span>
    </div>
  );
}
