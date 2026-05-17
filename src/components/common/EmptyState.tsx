type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <p
      className={`text-center text-sm text-muted ${className}`.trim()}
      role="status"
    >
      {title}
      {description ? (
        <>
          <br />
          <span className="text-xs">{description}</span>
        </>
      ) : null}
    </p>
  );
}
