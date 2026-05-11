import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import api from '../api/axiosConfig';

const PASSWORD_ENDPOINTS = {
  solicitar: 'seguridad/password/solicitar-codigo/',
  validar: 'seguridad/password/validar-codigo/',
  restablecer: 'seguridad/password/restablecer/',
};

const SERVICES = [
  { icon: '✂', title: 'Corte de cabello', desc: 'Cortes modernos, asesoramiento y acabado personalizado segun rostro y estilo.' },
  { icon: 'B', title: 'Corte + barba', desc: 'Servicio completo para cabello y barba, ideal para una renovacion total.' },
  { icon: '*', title: 'Perfilado de cejas', desc: 'Detalle adicional para mejorar la presentacion final del cliente.' },
  { icon: 'C', title: 'Color y ondulacion', desc: 'Servicios proyectados para ampliar la oferta de Blessed Barber Club.' },
];

const STEPS = [
  { n: '1', title: 'Registrate', desc: 'El usuario publico se registra unicamente como cliente con sus datos basicos.' },
  { n: '2', title: 'Elige servicio', desc: 'Selecciona corte, barba, perfilado u otro servicio disponible en la barberia.' },
  { n: '3', title: 'Reserva horario', desc: 'Consulta espacios libres y confirma la atencion con el barbero disponible.' },
];

const FEATURES = [
  'Atencion por reserva y horarios disponibles',
  'Historial de servicios para clientes registrados',
  'Notificaciones para cambios o reprogramaciones',
  'Panel administrativo para controlar la operacion',
];

// Normaliza errores de login, registro y recuperacion para mostrarlos al usuario.
function formatApiError(data, fallback = 'Ocurrio un error. Intenta nuevamente.') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (data.message) return data.message;

  const message = Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');

  return message || fallback;
}

// Landing publica.
// Contiene tres flujos: iniciar sesion, registrar cliente publico y recuperar contrasena.
export default function Landing() {
  const [tab, setTab] = useState('login');
  const [loginData, setLogin] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerData, setRegisterData] = useState({ nombre: '', apellido: '', telefono: '', codigo: '', correo: '', password: '', confirmar: '' });
  const [registerError, setRegisterError] = useState('');
  const [registerMsg, setRegisterMsg] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [recoverStep, setRecoverStep] = useState('correo');
  const [recoverData, setRecoverData] = useState({ correo: '', codigo: '', password: '', confirmar: '' });
  const [recoverError, setRecoverError] = useState('');
  const [recoverMsg, setRecoverMsg] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Login: usa AuthContext, guarda JWT y redirige al panel.
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(loginData.correo, loginData.password);
      const rol = String(u.rol || '').toLowerCase();
      const idRol = String(u.id_rol || '');
      const esCliente = rol.includes('cliente') || idRol === '3';
      navigate(esCliente ? '/cliente/inicio' : '/admin/dashboard');
    } catch (e) {
      setError(formatApiError(e.response?.data, 'Correo electronico o contrasena incorrectos.'));
    } finally {
      setLoading(false);
    }
  };

  const updateRegister = (field, value) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  };

  // Registro publico: crea usuario cliente en seguridad/registro-cliente/.
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterMsg('');

    if (registerData.password !== registerData.confirmar) {
      setRegisterError('Las contrasenas no coinciden.');
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await api.post('seguridad/registro-cliente/', {
        codigo: registerData.codigo,
        nombre: registerData.nombre,
        apellido: registerData.apellido,
        telefono: registerData.telefono,
        correo: registerData.correo,
        password: registerData.password,
      });
      setRegisterMsg(res.data?.mensaje || 'Cliente registrado correctamente. Ya puedes iniciar sesion.');
      setLogin({ correo: registerData.correo, password: '' });
      setRegisterData({ nombre: '', apellido: '', telefono: '', codigo: '', correo: '', password: '', confirmar: '' });
      setTab('login');
    } catch (err) {
      setRegisterError(formatApiError(err.response?.data, 'No se pudo crear la cuenta cliente.'));
    } finally {
      setRegisterLoading(false);
    }
  };

  const updateRecover = (field, value) => {
    setRecoverData(prev => ({ ...prev, [field]: value }));
  };

  // Recuperacion paso 1: solicita codigo temporal al correo.
  const requestResetCode = async (e) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverMsg('');
    setRecoverLoading(true);
    try {
      const res = await api.post(PASSWORD_ENDPOINTS.solicitar, { correo: recoverData.correo });
      setRecoverMsg(res.data?.message || res.data?.detail || 'Codigo temporal enviado. Revisa tu correo.');
      setRecoverStep('codigo');
    } catch (err) {
      setRecoverError(formatApiError(err.response?.data, 'No se pudo enviar el codigo temporal.'));
    } finally {
      setRecoverLoading(false);
    }
  };

  // Recuperacion paso 2: valida codigo temporal.
  const validateResetCode = async (e) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverMsg('');
    setRecoverLoading(true);
    try {
      const res = await api.post(PASSWORD_ENDPOINTS.validar, {
        correo: recoverData.correo,
        codigo: recoverData.codigo,
      });
      setRecoverMsg(res.data?.message || res.data?.detail || 'Codigo validado. Ingresa tu nueva contrasena.');
      setRecoverStep('password');
    } catch (err) {
      setRecoverError(formatApiError(err.response?.data, 'Codigo invalido o vencido.'));
    } finally {
      setRecoverLoading(false);
    }
  };

  // Recuperacion paso 3: guarda nueva contrasena en backend.
  const resetPassword = async (e) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverMsg('');

    if (recoverData.password !== recoverData.confirmar) {
      setRecoverError('Las contrasenas no coinciden.');
      return;
    }

    setRecoverLoading(true);
    try {
      const res = await api.post(PASSWORD_ENDPOINTS.restablecer, {
        correo: recoverData.correo,
        codigo: recoverData.codigo,
        nueva_password: recoverData.password,
        confirmar_password: recoverData.confirmar,
      });
      setRecoverMsg(res.data?.message || res.data?.detail || 'Contrasena restablecida correctamente.');
      setLogin({ correo: recoverData.correo, password: '' });
      setRecoverData({ correo: '', codigo: '', password: '', confirmar: '' });
      setRecoverStep('correo');
      setTab('login');
    } catch (err) {
      setRecoverError(formatApiError(err.response?.data, 'No se pudo restablecer la contrasena.'));
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-nav-wrap">
          <div className="landing-brand">
            <div className="landing-brand-icon">✂</div>
            Blessed Barber Club
          </div>
          <nav className="landing-nav">
            <a href="#inicio">Inicio</a>
            <a href="#servicios">Servicios</a>
            <a href="#como-funciona">Reservas</a>
            <a href="#barberia">Barberia</a>
            <a className="landing-nav-cta" href="#acceso">Ingresar</a>
          </nav>
        </div>
      </header>

      <section id="inicio" className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <div className="landing-eyebrow">Barberia premium en Santa Cruz</div>
            <h1 className="landing-hero-title">
              Reserva tu cita en <span>Blessed Barber Club</span>
            </h1>
            <p className="landing-hero-copy">
              Agenda tu corte, barba o servicio de imagen de forma rapida. Consulta horarios disponibles,
              elige tu servicio y manten tu historial de atencion como cliente registrado.
            </p>
            <div className="landing-hero-actions">
              <a href="#acceso"><button className="landing-btn landing-btn-gold">Reservar ahora</button></a>
              <a href="#servicios"><button className="landing-btn landing-btn-dark">Ver servicios</button></a>
            </div>
          </div>

          <div id="acceso" className="landing-auth-card">
            <div className="landing-tabs">
              {[['login', 'Ingresar'], ['registro', 'Registrarme'], ['recuperar', 'Olvide']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`landing-tab ${tab === id ? 'active' : ''}`}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <h2 className="landing-form-title">Iniciar sesion</h2>
                <p className="landing-form-copy">Accede segun tu rol: administrador, barbero o cliente.</p>

                {error && <div className="landing-alert landing-alert-error">{error}</div>}

                <div className="landing-field">
                  <label>Correo electronico</label>
                  <input className="input-field" type="email" placeholder="Ej: nombre@gmail.com"
                    value={loginData.correo} onChange={e => setLogin({ ...loginData, correo: e.target.value })} required />
                </div>
                <div className="landing-field">
                  <label>Contrasena</label>
                  <input className="input-field" type="password" placeholder="Ingresa tu contrasena"
                    value={loginData.password} onChange={e => setLogin({ ...loginData, password: e.target.value })} required />
                </div>
                <div className="landing-form-row">
                  <span>Olvidaste tu contrasena?</span>
                  <button type="button" onClick={() => setTab('recuperar')}>Recuperar</button>
                </div>
                <button type="submit" disabled={loading} className="landing-submit">
                  {loading ? 'Ingresando...' : 'Ingresar al sistema'}
                </button>
                <p className="landing-switch">
                  Sin cuenta?{' '}
                  <button type="button" onClick={() => setTab('registro')}>Registrate como cliente</button>
                </p>
              </form>
            )}

            {tab === 'registro' && (
              <form onSubmit={handleRegister}>
                <h2 className="landing-form-title">Crear cuenta cliente</h2>
                <p className="landing-form-copy">El registro publico es solo para clientes.</p>
                {registerError && <div className="landing-alert landing-alert-error">{registerError}</div>}
                {registerMsg && <div className="landing-alert landing-alert-success">{registerMsg}</div>}

                <div className="landing-two-cols">
                  <div className="landing-field">
                    <label>Nombre</label>
                    <input className="input-field" type="text" placeholder="Tu nombre" value={registerData.nombre} onChange={e => updateRegister('nombre', e.target.value)} required />
                  </div>
                  <div className="landing-field">
                    <label>Apellido</label>
                    <input className="input-field" type="text" placeholder="Tu apellido" value={registerData.apellido} onChange={e => updateRegister('apellido', e.target.value)} required />
                  </div>
                </div>
                <div className="landing-two-cols">
                  <div className="landing-field">
                    <label>Telefono</label>
                    <input className="input-field" type="text" placeholder="70000000" value={registerData.telefono} onChange={e => updateRegister('telefono', e.target.value)} required />
                  </div>
                  <div className="landing-field">
                    <label>CI</label>
                    <input className="input-field" type="text" placeholder="Carnet de identidad" value={registerData.codigo} onChange={e => updateRegister('codigo', e.target.value)} required />
                  </div>
                </div>
                <div className="landing-field">
                  <label>Correo electronico</label>
                  <input className="input-field" type="email" placeholder="cliente@gmail.com" value={registerData.correo} onChange={e => updateRegister('correo', e.target.value)} required />
                </div>
                <div className="landing-two-cols">
                  <div className="landing-field">
                    <label>Contrasena</label>
                    <input className="input-field" type="password" placeholder="Crear contrasena" value={registerData.password} onChange={e => updateRegister('password', e.target.value)} required />
                  </div>
                  <div className="landing-field">
                    <label>Confirmar</label>
                    <input className="input-field" type="password" placeholder="Repetir contrasena" value={registerData.confirmar} onChange={e => updateRegister('confirmar', e.target.value)} required />
                  </div>
                </div>
                <button type="submit" disabled={registerLoading} className="landing-submit">
                  {registerLoading ? 'Registrando...' : 'Registrarme como cliente'}
                </button>
                <p className="landing-switch landing-role-note">
                  Tu cuenta tendra el rol <strong>Cliente</strong>.
                </p>
              </form>
            )}

            {tab === 'recuperar' && (
              <form onSubmit={recoverStep === 'correo' ? requestResetCode : recoverStep === 'codigo' ? validateResetCode : resetPassword}>
                <h2 className="landing-form-title">Recuperar contrasena</h2>
                <p className="landing-form-copy">
                  {recoverStep === 'correo' && 'Ingresa tu correo para recibir un codigo temporal.'}
                  {recoverStep === 'codigo' && 'Escribe el codigo de 6 digitos que recibiste.'}
                  {recoverStep === 'password' && 'Crea una nueva contrasena para tu cuenta.'}
                </p>

                {recoverError && <div className="landing-alert landing-alert-error">{recoverError}</div>}
                {recoverMsg && <div className="landing-alert landing-alert-success">{recoverMsg}</div>}

                <div className="landing-field">
                  <label>Correo electronico</label>
                  <input className="input-field" type="email" placeholder="cliente@gmail.com" value={recoverData.correo}
                    onChange={e => updateRecover('correo', e.target.value)} disabled={recoverStep !== 'correo'} required />
                </div>

                {recoverStep !== 'correo' && (
                  <div className="landing-field">
                    <label>Codigo temporal</label>
                    <input className="input-field" type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={recoverData.codigo}
                      onChange={e => updateRecover('codigo', e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={recoverStep === 'password'} required />
                  </div>
                )}

                {recoverStep === 'password' && (
                  <div className="landing-two-cols">
                    <div className="landing-field">
                      <label>Nueva contrasena</label>
                      <input className="input-field" type="password" placeholder="Nueva contrasena" value={recoverData.password}
                        onChange={e => updateRecover('password', e.target.value)} required />
                    </div>
                    <div className="landing-field">
                      <label>Confirmar</label>
                      <input className="input-field" type="password" placeholder="Repetir contrasena" value={recoverData.confirmar}
                        onChange={e => updateRecover('confirmar', e.target.value)} required />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={recoverLoading} className="landing-submit">
                  {recoverLoading && 'Procesando...'}
                  {!recoverLoading && recoverStep === 'correo' && 'Enviar codigo'}
                  {!recoverLoading && recoverStep === 'codigo' && 'Validar codigo'}
                  {!recoverLoading && recoverStep === 'password' && 'Restablecer contrasena'}
                </button>
                <p className="landing-switch">
                  <button type="button" onClick={() => setTab('login')}>Volver al login</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section id="servicios" className="landing-section landing-section-white">
        <div className="landing-container">
          <div className="landing-section-head">
            <span>Servicios</span>
            <h2>Todo para tu imagen personal</h2>
            <p>Conoce los servicios disponibles antes de reservar tu cita.</p>
          </div>
          <div className="landing-service-grid">
            {SERVICES.map(s => (
              <div key={s.title} className="landing-service-card">
                <div className="landing-service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="landing-section-head">
            <span>Reservas</span>
            <h2>Como funciona la reserva</h2>
          </div>
          <div className="landing-step-grid">
            {STEPS.map(s => (
              <div key={s.n} className="landing-step-card">
                <div className="landing-step-number">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="barberia" className="landing-section landing-barberia">
        <div className="landing-barberia-grid">
          <div className="landing-barberia-image">✂</div>
          <div>
            <h2>Una experiencia organizada desde la reserva</h2>
            <p>Gestion completa para la barberia: citas, clientes, barberos, inventario y mas.</p>
            <div className="landing-feature-list">
              {FEATURES.map(f => (
                <div key={f}>✓ {f}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p><strong>Blessed Barber Club</strong> © 2026 - Sistema de informacion web para gestion de citas, clientes y servicios.</p>
      </footer>
    </div>
  );
}
