export function WishPriority({ priority }: { priority: number | null }) {
  if (priority === null) {
    return null;
  }

  return (
    <span role="img" aria-label={`Priority: ${priority} out of 5 stars`}>
      <span aria-hidden="true">
        {"★".repeat(priority)}
        {"☆".repeat(5 - priority)}
      </span>
    </span>
  );
}
