import { useState,useEffect } from "react";
import api from '../../api/axiosConfig';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {msg}</div>;
}
 
const EMPTY = { codigo: '', nombre: '', apellido: '', telefono: '', correo: '', password: '' };
 
function formatApiError(data) {
  if (!data) return 'Error al guardar';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

export default function Barberos() {
  const [barberos, setBarberos] = useState([]);
  const [buscar,   setBuscar]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [editCod,  setEditCod]  = useState(null);
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });
 
  const cargar = async () => {
    try { const r = await api.get('seguridad/barberos/'); setBarberos(r.data); }
    catch { showToast('Error al cargar barberos', 'error'); }
  };
 
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar    = () => { setModal(null); setForm(EMPTY); setEditCod(null); };
 
  const abrirCrear  = () => { setForm(EMPTY); setModal('crear'); };
  const abrirEditar = (b) => {
    setForm({ codigo: b.codigo, nombre: b.nombre, apellido: b.apellido, telefono: b.telefono, correo: b.correo, password: '' });
    setEditCod(b.codigo);
    setModal('editar');
  };
  const abrirVer = (b) => { setForm(b); setModal('ver'); };
 
  const guardar = async () => {
    setLoading(true);
    try {
      if (modal === 'crear') {
        await api.post('seguridad/barberos/', form);
        showToast('Barbero registrado correctamente');
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`seguridad/barberos/${editCod}/`, payload);
        showToast('Barbero actualizado correctamente');
      }
      cerrar(); cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally { setLoading(false); }
  };
 
  const eliminar = async (codigo) => {
    if (!confirm('¿Eliminar este barbero?')) return;
    try {
      await api.delete(`seguridad/barberos/${codigo}/`);
      showToast('Barbero eliminado');
      cargar();
    } catch (e) { showToast(e.response?.data?.error || 'Error al eliminar', 'error'); }
  };
 
  const filtrados = barberos.filter(b =>
    [b.nombre, b.apellido, b.codigo, b.telefono].some(v => v?.toLowerCase().includes(buscar.toLowerCase()))
  );
 
  // Especialidades ficticias para mostrar (en BD real vendrían del campo)
  const SPECS = ['Low fade / Mid fade', 'Barba / Cejas', 'Color / Ondulación', 'Corte clásico'];
 
  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20 }}>Gestión de barberos</h3>
            <p style={{ color: '#64748b', fontSize: 13 }}>Administra datos, especialidades y estado del personal.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nuevo barbero</button>
        </div>
 
        <div className="search-box" style={{ marginBottom: 20, maxWidth: '100%' }}>
          <span className="icon">🔍</span>
          <input placeholder="Buscar por nombre, CI o teléfono..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
 
        <table className="tabla">
          <thead>
            <tr><th>Nombre</th><th>Teléfono</th><th>Especialidad</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No se encontraron barberos.</td></tr>
            ) : filtrados.map((b, i) => (
              <tr key={b.codigo}>
                <td style={{ fontWeight: 700 }}>{b.nombre} {b.apellido}</td>
                <td>{b.telefono}</td>
                <td style={{ color: '#64748b' }}>{SPECS[i % SPECS.length]}</td>
                <td><span className={`badge ${i === 2 ? 'badge-red' : 'badge-green'}`}>{i === 2 ? 'Inactivo' : 'Activo'}</span></td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-outline" onClick={() => abrirVer(b)}>Ver</button>
                  <button className="btn-outline" onClick={() => abrirEditar(b)}>Editar</button>
                  <button className="btn-outline" onClick={() => eliminar(b.codigo)} style={{ color: '#ef4444', borderColor: '#fecaca' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {/* Modal Crear / Editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar barbero' : 'Editar barbero'}</h3>
            <p>El rol Barbero se asigna automáticamente.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Código</label>
                <input className="input-field" placeholder="Ej: BARB001" value={form.codigo}
                  onChange={e => setForm({...form, codigo: e.target.value})} disabled={modal === 'editar'} />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input className="input-field" placeholder="75000000" value={form.telefono}
                  onChange={e => setForm({...form, telefono: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input className="input-field" placeholder="Nombre" value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input className="input-field" placeholder="Apellido" value={form.apellido}
                  onChange={e => setForm({...form, apellido: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input className="input-field" type="email" placeholder="barbero@gmail.com" value={form.correo}
                onChange={e => setForm({...form, correo: e.target.value})} />
            </div>
            <div className="form-group">
              <label>{modal === 'editar' ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
              <input className="input-field" type="password" placeholder="••••••" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-outline" onClick={cerrar} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn-gold" onClick={guardar} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Modal Ver */}
      {modal === 'ver' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Detalle del barbero</h3>
            <p>Información del barbero seleccionado.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {[['Código', form.codigo],['Nombre', form.nombre],['Apellido', form.apellido],['Teléfono', form.telefono],['Correo', form.correo]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 14 }}>{l}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn-gold" onClick={cerrar} style={{ width: '100%', marginTop: 16 }}>Cerrar</button>
          </div>
        </div>
      )}
 
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
