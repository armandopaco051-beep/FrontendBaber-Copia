import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {msg}</div>;
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [buscar,   setBuscar]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    try {
      const r = await api.get('seguridad/usuarios/');
      // Filtrar solo clientes
      setClientes(r.data.filter(u => u.rol === 'Cliente' || u.rol?.toLowerCase() === 'cliente'));
    } catch { showToast('Error al cargar clientes', 'error'); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const TIPO = ['Frecuente', 'Nuevo', 'Inactivo'];
  const TIPO_STYLE = {
    Frecuente: 'badge-blue',
    Nuevo:     'badge-green',
    Inactivo:  'badge-red',
  };

  const filtrados = clientes.filter(c =>
    [c.nombre, c.apellido, c.telefono, c.codigo].some(v => v?.toLowerCase().includes(buscar.toLowerCase()))
  );

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20 }}>Gestión de clientes</h3>
            <p style={{ color: '#64748b', fontSize: 13 }}>Consulta clientes, historial y frecuencia de visitas.</p>
          </div>
          <button className="btn-gold">+ Nuevo cliente</button>
        </div>

        <div className="search-box" style={{ marginBottom: 20, maxWidth: '100%' }}>
          <span className="icon">🔍</span>
          <input placeholder="Buscar por nombre, teléfono o CI..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Teléfono</th><th>Tipo</th><th>Última visita</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No se encontraron clientes.</td></tr>
            ) : filtrados.map((c, i) => {
              const tipo = TIPO[i % TIPO.length];
              return (
                <tr key={c.codigo}>
                  <td style={{ fontWeight: 700 }}>{c.nombre} {c.apellido}</td>
                  <td>{c.telefono}</td>
                  <td><span className={`badge ${TIPO_STYLE[tipo]}`}>{tipo}</span></td>
                  <td style={{ color: '#64748b' }}>07/05/2026</td>
                  <td>
                    <button className="btn-outline" onClick={() => { setSelected(c); setModal('historial'); }}>
                      Historial
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Historial */}
      {modal === 'historial' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Historial — {selected.nombre} {selected.apellido}</h3>
            <p>Servicios anteriores del cliente.</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
              {[
                { fecha: '07/05/2026', servicio: 'Corte de cabello', barbero: 'Sebastián', total: 'Bs. 60' },
                { fecha: '24/04/2026', servicio: 'Corte + barba',    barbero: 'Carlos',    total: 'Bs. 90' },
                { fecha: '10/04/2026', servicio: 'Perfilado',        barbero: 'Renato',    total: 'Bs. 30' },
              ].map(h => (
                <div key={h.fecha} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{h.servicio}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{h.fecha} · {h.barbero}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#c9a227' }}>{h.total}</div>
                </div>
              ))}
            </div>
            <button className="btn-gold" onClick={() => setModal(null)} style={{ width: '100%', marginTop: 16 }}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
