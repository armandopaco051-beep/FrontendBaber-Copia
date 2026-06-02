import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  codigo_barbero: '',
  porcentaje_barbero: '',
  porcentaje_barberia: '',
  fecha_inicio: '',
  estado: 'ACTIVO',
};

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function normalizarLista(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function idPlan(item) {
  return item?.id_plan_comision || item?.id || '';
}

function codigoBarbero(item) {
  return item?.codigo || item?.codigo_barbero || item?.id || '';
}

function nombreBarbero(item) {
  return `${item?.nombre || ''} ${item?.apellido || ''}`.trim() || item?.barbero_nombre || item?.correo || '-';
}

function badgeEstado(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

export default function PlanesComision() {
  const [planes, setPlanes] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    const [planesRes, barberosRes] = await Promise.allSettled([
      api.get('ventas-caja/planes-comision/'),
      api.get('usuario/barberos/'),
    ]);

    if (planesRes.status === 'fulfilled') setPlanes(normalizarLista(planesRes.value.data, 'planes_comision'));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data, 'barberos'));
    if (planesRes.status === 'rejected' || barberosRes.status === 'rejected') {
      showToast('No se pudieron cargar todos los datos de planes de comision.', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY });
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const abrirEditar = (plan) => {
    setEditId(idPlan(plan));
    setForm({
      nombre: plan?.nombre || '',
      descripcion: plan?.descripcion || '',
      codigo_barbero: typeof plan?.codigo_barbero === 'object' ? codigoBarbero(plan.codigo_barbero) : plan?.codigo_barbero || '',
      porcentaje_barbero: plan?.porcentaje_barbero ?? '',
      porcentaje_barberia: plan?.porcentaje_barberia ?? '',
      fecha_inicio: plan?.fecha_inicio || '',
      estado: plan?.estado || 'ACTIVO',
    });
    setModal('editar');
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre del plan es obligatorio.', 'error');
    if (!form.codigo_barbero) return showToast('Selecciona un barbero.', 'error');
    if (!form.fecha_inicio) return showToast('La fecha de inicio es obligatoria.', 'error');

    setLoading(true);
    try {
      if (modal === 'crear') {
        await api.post('ventas-caja/planes-comision/', form);
        showToast('Plan de comision registrado correctamente.');
      } else {
        await api.put(`ventas-caja/planes-comision/${editId}/`, form);
        showToast(form.estado === 'ACTIVO' ? 'Plan de comision actualizado/activado correctamente.' : 'Plan de comision actualizado correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar el plan de comision.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (plan) => {
    if (!confirm(`Desactivar el plan "${plan.nombre}"?`)) return;
    try {
      await api.delete(`ventas-caja/planes-comision/${idPlan(plan)}/`);
      showToast('Plan de comision desactivado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo desactivar el plan de comision.'), 'error');
    }
  };

  const activar = async (plan) => {
    try {
      await api.put(`ventas-caja/planes-comision/${idPlan(plan)}/`, { estado: 'ACTIVO' });
      showToast('Plan de comision activado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar el plan de comision.'), 'error');
    }
  };

  const planesFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return planes.filter(plan => [
      plan?.nombre,
      plan?.descripcion,
      plan?.barbero_nombre,
      plan?.estado,
      plan?.porcentaje_barbero,
      plan?.porcentaje_barberia,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, planes]);

  return (
    <div>
      <div className="ventas-caja-stats">
        <div className="stat-card">
          <div className="label">Planes</div>
          <div className="value">{planes.length}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Activos</div>
          <div className="value gold">{planes.filter(item => item.estado === 'ACTIVO').length}</div>
          <div className="sub">Vigentes</div>
        </div>
      </div>

      <div className="card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Gestion de planes de comision</h3>
            <p className="ventas-caja-subtitle">Define porcentajes de ganancia para barberos y barberia.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Registrar plan de comision</button>
        </div>

        <div className="search-box ventas-caja-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por plan, barbero o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Plan</th><th>Barbero</th><th>Porcentaje barbero</th><th>Porcentaje barberia</th><th>Inicio</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {planesFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="ventas-caja-empty">No se encontraron planes de comision.</td></tr>
            ) : planesFiltrados.map(plan => (
              <tr key={idPlan(plan)}>
                <td>
                  <div className="ventas-caja-name">{plan.nombre}</div>
                  <div className="ventas-caja-muted">{plan.descripcion || 'Sin descripcion'}</div>
                </td>
                <td>{plan.barbero_nombre || '-'}</td>
                <td>{plan.porcentaje_barbero}%</td>
                <td>{plan.porcentaje_barberia}%</td>
                <td>{plan.fecha_inicio}</td>
                <td><span className={`badge ${badgeEstado(plan.estado)}`}>{plan.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td className="ventas-caja-row-actions">
                  <button className="btn-outline" onClick={() => abrirEditar(plan)}>Editar</button>
                  {plan.estado === 'ACTIVO' ? (
                    <button className="btn-outline ventas-caja-delete" onClick={() => desactivar(plan)}>Desactivar</button>
                  ) : (
                    <button className="btn-outline" onClick={() => activar(plan)}>Activar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box ventas-caja-plan-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar plan de comision' : 'Editar plan de comision'}</h3>
            <p>Asigna un barbero, define porcentajes y controla el estado del plan.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Plan base 60/40" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field ventas-caja-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del plan de comision" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Barbero</label>
                <select className="input-field" value={form.codigo_barbero} onChange={e => setForm({ ...form, codigo_barbero: e.target.value })}>
                  <option value="">Seleccionar barbero</option>
                  {barberos.map(barbero => <option key={codigoBarbero(barbero)} value={codigoBarbero(barbero)}>{nombreBarbero(barbero)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha de inicio</label>
                <input className="input-field" type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Porcentaje barbero</label>
                <input className="input-field" type="number" min="0" max="100" step="0.01" value={form.porcentaje_barbero} onChange={e => setForm({ ...form, porcentaje_barbero: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Porcentaje barberia</label>
                <input className="input-field" type="number" min="0" max="100" step="0.01" value={form.porcentaje_barberia} onChange={e => setForm({ ...form, porcentaje_barberia: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline ventas-caja-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
