interface Props {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: Props) {
  return (
    <header className="mb-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
    </header>
  );
}
