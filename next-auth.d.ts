import "next-auth";
import "next-auth/react";

declare module "next-auth/react" {
  import { SessionProviderProps } from "next-auth/react";
  import { ReactNode } from "react";

  // Override SessionProvider to fix React 19 compatibility
  export function SessionProvider(
    props: SessionProviderProps & { children: ReactNode }
  ): ReactNode;
}