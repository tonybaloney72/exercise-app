export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-start px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center sm:py-10 sm:pb-10">
        {children}
      </div>
    </main>
  );
}
