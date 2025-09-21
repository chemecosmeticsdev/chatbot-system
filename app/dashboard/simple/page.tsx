'use client';

import { useUser } from '@stackframe/stack';

export default function SimpleDashboardPage() {
  const user = useUser({ or: 'redirect' });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Simple Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome {user?.displayName || user?.primaryEmail}! This is a simplified dashboard to test the header component.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Test Card 1</h3>
          <p className="text-sm text-muted-foreground">This is a test card</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Test Card 2</h3>
          <p className="text-sm text-muted-foreground">This is another test card</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Test Card 3</h3>
          <p className="text-sm text-muted-foreground">This is a third test card</p>
        </div>
      </div>
    </div>
  );
}