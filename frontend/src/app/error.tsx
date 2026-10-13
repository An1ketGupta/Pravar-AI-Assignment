"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="initial-loading">
      <div className="empty-state">
        <h2>Something interrupted your workspace</h2>
        <p>Please try again. Your saved leads and conversations are safe.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
