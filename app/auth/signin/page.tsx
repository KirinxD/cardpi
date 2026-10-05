import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={
        <div className="w-full max-w-md">
          <div className="pixel-card text-center py-12" style={{ borderColor: "#00b84a" }}>
            <div className="text-digimon-green font-pixel text-lg animate-pulse">CARGANDO...</div>
          </div>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}