import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '../services/supabaseClient';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  // We keep the state logic just in case we need to show a warning, 
  // but the configuration UI is moved to the inner app settings.

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow login even if not configured, so user can go to Settings to configure it.
    // Or we could block it. Given the instructions "moved to settings", we let them in.
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dot-grid">
      <div className="max-w-md w-full relative">
        {/* Background shapes */}
        <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-tertiary rounded-full border-2 border-slate-800 -z-10"></div>
        <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-secondary rounded-full border-2 border-slate-800 -z-10"></div>

        <Card className="shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent rounded-xl border-2 border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-hard">
               <Layers className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black font-heading text-slate-800">Arunika Flow</h1>
            <p className="text-slate-500">Masuk untuk mengelola kontenmu.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="Email" type="email" placeholder="kamu@arunika.id" />
            <Input label="Password" type="password" placeholder="••••••••" />
            
            <div className="pt-2">
                <Button className="w-full" type="submit">Masuk Sekarang</Button>
            </div>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500">
            Belum punya akun? <a href="#" className="text-accent font-bold hover:underline">Daftar dulu</a>
          </p>
          
          {!isSupabaseConfigured() && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg border border-yellow-200 text-center">
                  Database belum terhubung. Silakan Login lalu buka menu <b>Settings &gt; Integrasi</b>.
              </div>
          )}
        </Card>
      </div>
    </div>
  );
};