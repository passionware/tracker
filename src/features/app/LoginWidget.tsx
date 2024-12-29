import { LoginForm } from "@/features/app/login-form.tsx";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-100 p-6 md:p-10 dark:bg-slate-800">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  );
}
