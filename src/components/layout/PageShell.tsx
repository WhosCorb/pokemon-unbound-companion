interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="max-w-lg mx-auto px-3 py-3 pb-20 space-y-3">
      {children}
    </main>
  );
}
