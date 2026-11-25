import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Lock, Mail } from 'lucide-react';
import type { Usuario } from '../types/kurokaze';
import { guardarSesion, rutaPorDefectoRol } from '../utils/sesion';

const API_URL = 'http://localhost:4000/api';

export function LoginView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('mozo@kurokaze.pe');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'No se pudo iniciar sesión');
        return;
      }

      const usuario: Usuario = data.usuario;
      guardarSesion(data.token, usuario);
      navigate(rutaPorDefectoRol(usuario.rol), { replace: true });
    } catch {
      setError('No se pudo conectar con el servidor de Kurokaze');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide">KUROKAZE</h1>
            <p className="text-xs text-neutral-400">Restaurante · Bar Japonés</p>
          </div>
        </div>

        <p className="text-sm text-neutral-400 mb-6">
          Inicia sesión con tu cuenta de staff para operar según tu rol.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Correo</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-neutral-900 border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-neutral-900 border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-semibold py-2.5 text-sm transition"
          >
            {cargando ? 'Verificando JWT...' : 'Entrar a Kurokaze'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-neutral-400 space-y-1">
          <p className="font-medium text-neutral-300">Usuarios de prueba (pass: 123456):</p>
          <p>Mozo: <span className="text-neutral-200">mozo@kurokaze.pe</span></p>
          <p>Cocinero: <span className="text-neutral-200">cocina@kurokaze.pe</span></p>
          <p>Cajero: <span className="text-neutral-200">caja@kurokaze.pe</span></p>
          <p>Admin: <span className="text-neutral-200">admin@kurokaze.pe</span></p>
        </div>
      </div>
    </div>
  );
}