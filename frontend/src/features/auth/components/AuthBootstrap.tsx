import { useEffect, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { sessionService } from "../services/session.service";

interface Props {
  children: ReactNode;
}

export default function AuthBootstrap({ children }: Props) {
  const { hydrated, authStatus } = useAuth();

  useEffect(() => {
    if (!hydrated) return;

    const bootstrap = async () => {
      try {
        await sessionService.bootstrapSession();
      } catch (err) {
        console.error("Bootstrap session failed:", err);
      }
    };

    bootstrap();
  }, [hydrated]);

  if (!hydrated || authStatus === "checking") {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}