export function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-6 text-center gap-4">
      <h1 className="text-3xl font-bold tracking-tight">About nerdShare</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed">
        nerdShare is a free, open-source, peer-to-peer file sharing tool built
        for people who care about privacy. No accounts, no servers, no limits.
      </p>
    </div>
  );
}
