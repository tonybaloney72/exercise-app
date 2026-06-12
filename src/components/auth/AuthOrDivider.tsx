export default function AuthOrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-caption uppercase tracking-wider text-muted">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
