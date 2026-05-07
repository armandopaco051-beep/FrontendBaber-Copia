import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authContext';

export default function Landing() {
  const [tab, setTab]         = useState('login');
  const [loginData, setLogin] = useState({ correo: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(loginData.correo, loginData.password);
      if (u.rol === 'Administrador' || u.rol === 'Barbero') {
        navigate('/admin/dashboard');
      } else {
        navigate('/admin/dashboard'); // futuro: panel cliente
      }
    } catch {
      setError('Código o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Navbar ── */}
      <header style={{
        width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth: 1200, margin: 'auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontWeight: 'bold', fontSize: 20, fontFamily: "'Sora',sans-serif" }}>
            <div style={{ width: 42, height: 42, background: '#d4af37', color: '#0f172a', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✂</div>
            Blessed Barber Club
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24, color: '#cbd5e1', fontSize: 14 }}>
            <a href="#inicio" style={{ color: '#cbd5e1' }}>Inicio</a>
            <a href="#servicios" style={{ color: '#cbd5e1' }}>Servicios</a>
            <a href="#como-funciona" style={{ color: '#cbd5e1' }}>Reservas</a>
            <a href="#barberia" style={{ color: '#cbd5e1' }}>Barbería</a>
            <a href="#acceso" style={{ background: '#d4af37', color: '#0f172a', padding: '10px 16px', borderRadius: 14, fontWeight: 700 }}>Ingresar</a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="inicio" style={{
        minHeight: '100vh', padding: '120px 24px 70px',
        background: 'linear-gradient(90deg,rgba(15,23,42,.95) 0%,rgba(15,23,42,.82) 48%,rgba(15,23,42,.52) 100%), linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
        color: 'white', display: 'flex', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1200, margin: 'auto', width: '100%', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 42, alignItems: 'center' }}>
          {/* Texto izquierda */}
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(212,175,55,.16)', border: '1px solid rgba(212,175,55,.35)', color: '#d4af37', padding: '9px 14px', borderRadius: 999, fontSize: 14, fontWeight: 700, marginBottom: 20 }}>
              Barbería premium en Santa Cruz
            </div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 58, lineHeight: 1.05, marginBottom: 20 }}>
              Reserva tu cita en <span style={{ color: '#d4af37' }}>Blessed Barber Club</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: '#cbd5e1', maxWidth: 650, marginBottom: 28 }}>
              Agenda tu corte, barba o servicio de imagen de forma rápida. Consulta horarios disponibles,
              elige tu servicio y mantén tu historial de atención como cliente registrado.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <a href="#acceso">
                <button style={{ background: '#d4af37', color: '#0f172a', border: 'none', padding: '14px 20px', borderRadius: 16, fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>
                  Reservar ahora
                </button>
              </a>
              <a href="#servicios">
                <button style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', color: 'white', padding: '14px 20px', borderRadius: 16, fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>
                  Ver servicios
                </button>
              </a>
            </div>
          </div>

          {/* Auth Card */}
          <div id="acceso" style={{ background: 'rgba(255,255,255,.97)', color: '#0f172a', borderRadius: 28, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,.35)' }}>
            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, background: '#f1f5f9', padding: 6, borderRadius: 18, marginBottom: 22 }}>
              {[['login','Ingresar'],['registro','Registrarme'],['recuperar','Olvidé']].map(([id,label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  border: 'none', borderRadius: 14, padding: '11px 8px', fontWeight: 700, cursor: 'pointer',
                  background: tab === id ? '#0f172a' : 'transparent',
                  color: tab === id ? 'white' : '#64748b',
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13, transition: '.18s',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Login ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, marginBottom: 6 }}>Iniciar sesión</h2>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 18 }}>Accede según tu rol: administrador, barbero o cliente.</p>

                {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 12, fontSize: 13, marginBottom: 14 }}>{error}</div>}

                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#334155' }}>Correo electronico</label>
                  <input className="input-field" type="email" placeholder="Ej: nombre@gmail.com"
                    value={loginData.correo} onChange={e => setLogin({...loginData, correo: e.target.value})} required />
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#334155' }}>Contraseña</label>
                  <input className="input-field" type="password" placeholder="Ingresa tu contraseña"
                    value={loginData.password} onChange={e => setLogin({...loginData, password: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, fontSize: 14, color: '#64748b' }}>
                  <span>¿Olvidaste tu contraseña?</span>
                  <span onClick={() => setTab('recuperar')} style={{ color: '#c9a227', fontWeight: 700, cursor: 'pointer' }}>Recuperar</span>
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', border: 'none', borderRadius: 16, padding: 14,
                  background: loading ? '#e2c96a' : '#d4af37', color: '#0f172a',
                  fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontFamily: "'DM Sans',sans-serif",
                }}>
                  {loading ? 'Ingresando...' : 'Ingresar al sistema'}
                </button>
                <p style={{ marginTop: 16, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                  ¿Sin cuenta?{' '}
                  <span onClick={() => setTab('registro')} style={{ color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>Regístrate como cliente</span>
                </p>
              </form>
            )}

            {/* ── Registro ── */}
            {tab === 'registro' && (
              <form>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, marginBottom: 6 }}>Crear cuenta cliente</h2>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 18 }}>El registro público es solo para clientes.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Nombre</label>
                    <input className="input-field" type="text" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Apellido</label>
                    <input className="input-field" type="text" placeholder="Tu apellido" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Teléfono</label>
                    <input className="input-field" type="text" placeholder="70000000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>CI</label>
                    <input className="input-field" type="text" placeholder="Carnet de identidad" />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Correo electrónico</label>
                  <input className="input-field" type="email" placeholder="cliente@gmail.com" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Contraseña</label>
                    <input className="input-field" type="password" placeholder="Crear contraseña" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Confirmar</label>
                    <input className="input-field" type="password" placeholder="Repetir contraseña" />
                  </div>
                </div>
                <button type="button" style={{ width: '100%', border: 'none', borderRadius: 16, padding: 14, background: '#d4af37', color: '#0f172a', fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>
                  Registrarme como cliente
                </button>
                <p style={{ marginTop: 14, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                  Tu cuenta tendrá el rol <strong style={{ color: '#0f172a' }}>Cliente</strong>.
                </p>
              </form>
            )}

            {/* ── Recuperar ── */}
            {tab === 'recuperar' && (
              <form>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, marginBottom: 6 }}>Recuperar contraseña</h2>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 18 }}>Ingresa tu correo o teléfono. Te enviaremos instrucciones.</p>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#334155' }}>Correo o teléfono</label>
                  <input className="input-field" type="text" placeholder="cliente@gmail.com o 70000000" />
                </div>
                <button type="button" style={{ width: '100%', border: 'none', borderRadius: 16, padding: 14, background: '#d4af37', color: '#0f172a', fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>
                  Enviar instrucciones
                </button>
                <p style={{ marginTop: 14, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                  <span onClick={() => setTab('login')} style={{ color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>Volver al login</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Servicios ── */}
      <section id="servicios" style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 42 }}>
            <span style={{ color: '#c9a227', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Servicios</span>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 38, marginTop: 10 }}>Todo para tu imagen personal</h2>
            <p style={{ color: '#64748b', maxWidth: 700, margin: '12px auto 0', lineHeight: 1.6 }}>
              Conoce los servicios disponibles antes de reservar tu cita.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {[
              { icon: '✂', title: 'Corte de cabello', desc: 'Cortes modernos, asesoramiento y acabado personalizado según rostro y estilo.' },
              { icon: '🧔', title: 'Corte + barba', desc: 'Servicio completo para cabello y barba, ideal para una renovación total.' },
              { icon: '✨', title: 'Perfilado de cejas', desc: 'Detalle adicional para mejorar la presentación final del cliente.' },
              { icon: '🎨', title: 'Color y ondulación', desc: 'Servicios proyectados para ampliar la oferta de Blessed Barber Club.' },
            ].map(s => (
              <div key={s.title} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 24, padding: 24, boxShadow: '0 10px 30px rgba(15,23,42,.04)', transition: '.2s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontFamily: "'Sora',sans-serif", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 42 }}>
            <span style={{ color: '#c9a227', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Reservas</span>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 38, marginTop: 10 }}>Cómo funciona la reserva</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[
              { n: '1', title: 'Regístrate', desc: 'El usuario público se registra únicamente como cliente con sus datos básicos.' },
              { n: '2', title: 'Elige servicio', desc: 'Selecciona corte, barba, perfilado u otro servicio disponible en la barbería.' },
              { n: '3', title: 'Reserva horario', desc: 'Consulta espacios libres y confirma la atención con el barbero disponible.' },
            ].map(s => (
              <div key={s.n} style={{ background: '#0f172a', color: 'white', borderRadius: 26, padding: 28 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#d4af37', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 18, fontFamily: "'Sora',sans-serif", fontSize: 18 }}>{s.n}</div>
                <h3 style={{ fontFamily: "'Sora',sans-serif", marginBottom: 10, fontSize: 20 }}>{s.title}</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: 14 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Barbería ── */}
      <section id="barberia" style={{ padding: '80px 24px', background: '#0f172a', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
          <div style={{ minHeight: 420, borderRadius: 32, background: 'linear-gradient(135deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>✂</div>
          <div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 40, marginBottom: 16 }}>Una experiencia organizada desde la reserva</h2>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7, marginBottom: 22 }}>Gestión completa para la barbería: citas, clientes, barberos, inventario y más.</p>
            <div style={{ display: 'grid', gap: 12 }}>
              {['✔ Atención por reserva y horarios disponibles','✔ Historial de servicios para clientes registrados','✔ Notificaciones para cambios o reprogramaciones','✔ Panel administrativo para controlar la operación'].map(f => (
                <div key={f} style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 14, color: '#e2e8f0' }}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#020617', color: '#cbd5e1', padding: '28px 24px', textAlign: 'center', fontSize: 14 }}>
        <p><strong style={{ color: '#d4af37' }}>Blessed Barber Club</strong> © 2026 - Sistema de información web para gestión de citas, clientes y servicios.</p>
      </footer>
    </div>
  );
}
