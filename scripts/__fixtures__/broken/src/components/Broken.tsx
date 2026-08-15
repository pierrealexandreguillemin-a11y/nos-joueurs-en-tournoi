// Calibration fixture — fault 3: a fixed Tailwind palette colour instead of a
// semantic token, which makes the component blind to theme and mode.
export function Broken() {
  return (
    <div className="bg-card text-card-foreground">
      <span className="bg-green-100 text-green-800">ok</span>
      <span className="bg-gradient-to-r from-amber-500 to-orange-600">attention</span>
    </div>
  );
}
