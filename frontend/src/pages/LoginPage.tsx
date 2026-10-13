import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, AlertCircle, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('admin@campusx.edu');
  const [password, setPassword] = useState<string>('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const demoAccounts = [
    { label: 'Admin', email: 'admin@campusx.edu', pass: 'Admin@123', color: 'cyan' },
    { label: 'Faculty', email: 'faculty@campusx.edu', pass: 'Faculty@123', color: 'blue' },
    { label: 'Student', email: 'student@campusx.edu', pass: 'Student@123', color: 'emerald' },
    { label: 'Placement Officer', email: 'placement@campusx.edu', pass: 'Placement@123', color: 'amber' },
    { label: 'Management', email: 'management@campusx.edu', pass: 'Management@123', color: 'rose' },
    { label: 'Super Admin', email: 'superadmin@campusx.edu', pass: 'SuperAdmin@123', color: 'slate' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Invalid email or password. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 items-center justify-center shadow-xl shadow-cyan-500/20 mb-2">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Campus<span className="text-cyan-400">X</span> Intelligence
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access your role-based academic portal
          </p>
        </div>

        {/* Demo Account Pills */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Quick Demo Login:
            </span>
            <span className="text-[11px] font-mono text-slate-500">1-click select</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.label}
                type="button"
                onClick={() => handleSelectDemo(acc.email, acc.pass)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition flex items-center justify-center gap-1 ${
                  email === acc.email
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-[#0F172A] border-[#1E293B] text-slate-300 hover:border-slate-700'
                }`}
              >
                {email === acc.email && <Check className="w-3 h-3 text-cyan-400" />}
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@campusx.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={loading}
            >
              Sign In to Platform
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          CampusX Secure Operating System &bull; RBAC Protected
        </p>
      </div>
    </div>
  );
};
