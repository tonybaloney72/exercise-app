export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-10">
        {children}
      </div>
    </main>
  );
}
