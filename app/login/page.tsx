import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="card-elevated bg-surface-elevated border border-border rounded-xl p-8 animate-pulse"><div className="h-8 bg-border rounded w-3/4 mx-auto mb-4"></div><div className="h-4 bg-border rounded w-1/2 mx-auto mb-2"></div><div className="h-4 bg-border rounded w-full mx-auto"></div></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}